using System.Security.Claims;
using System.Text.Json;
using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/exam-attempts")]
[Authorize(Roles = "Student")]
public class ExamAttemptsController : ControllerBase
{
    private const int ExamQuestionCount = 30;
    private static readonly TimeSpan ExamDuration = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly AiGenerationJobService _generationJobs;

    public ExamAttemptsController(AppDbContext db, AiGenerationJobService generationJobs)
    {
        _db = db;
        _generationJobs = generationJobs;
    }

    [HttpPost("start")]
    public async Task<ActionResult<ExamSessionResponse>> Start(
        [FromBody] StartExamRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ModelId is < 1 or > 8)
            return BadRequest(new { message = "رقم النموذج يجب أن يكون بين 1 و8." });

        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        var now = DateTime.UtcNow;

        var active = await _db.ExamAttempts
            .Where(x => x.StudentId == studentId && !x.Completed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (active is not null)
        {
            if (active.ExpiresAt <= now)
            {
                active.Completed = true;
                active.CompletedAt = now;
                await _db.SaveChangesAsync(cancellationToken);
                active = null;
            }
            else if (active.ModelId != request.ModelId)
            {
                return Conflict(new { message = "لديك اختبار غير مكتمل. أكمل الاختبار الحالي أولاً أو عد إليه لاحقاً." });
            }
            else
            {
                return await BuildSessionResponseAsync(active, cancellationToken);
            }
        }

        List<Question> questions;
        try
        {
            questions = await ExamQuestionPicker.GetAsync(_db, request.ModelId);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentOutOfRangeException)
        {
            return Conflict(new { message = "تعذر تجهيز ٣٠ سؤالاً صالحاً لهذا النموذج." });
        }

        if (questions.Count != ExamQuestionCount)
            return Conflict(new { message = "تعذر تجهيز ٣٠ سؤالاً صالحاً لهذا النموذج." });

        var questionIds = questions.Select(q => q.Id).Distinct().ToList();
        if (questionIds.Count != ExamQuestionCount)
            return Conflict(new { message = "تم اكتشاف تكرار داخل نموذج الاختبار. لم يبدأ الاختبار." });

        await _generationJobs.AttachStudentMediaUrlsAsync(
            questions, cancellationToken, includeUnapprovedAiImages: false);

        var attempt = new ExamAttempt
        {
            StudentId = studentId,
            ModelId = request.ModelId,
            Correct = 0,
            Total = ExamQuestionCount,
            Answered = 0,
            WrongQuestionIds = new(),
            QuestionIds = questionIds,
            AnswersJson = "{}",
            Completed = false,
            ExpiresAt = now.Add(ExamDuration),
            CreatedAt = now
        };

        _db.ExamAttempts.Add(attempt);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsActiveAttemptConflict(ex))
        {
            // A concurrent first-start request may have created the active session
            // between our initial read and insert. Reuse that session rather than
            // creating or exposing a second active exam.
            _db.Entry(attempt).State = EntityState.Detached;

            var concurrentActive = await _db.ExamAttempts
                .Where(x => x.StudentId == studentId && !x.Completed)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (concurrentActive is null)
                return Conflict(new { message = "تعذر إنشاء جلسة اختبار واحدة بشكل آمن. أعد المحاولة." });

            if (concurrentActive.ModelId != request.ModelId)
                return Conflict(new { message = "لديك اختبار غير مكتمل. أكمل الاختبار الحالي أولاً أو عد إليه لاحقاً." });

            return await BuildSessionResponseAsync(concurrentActive, cancellationToken);
        }

        return Ok(new ExamSessionResponse(
            attempt.Id,
            attempt.ModelId,
            attempt.ExpiresAt,
            new Dictionary<int, int>(),
            BuildSessionQuestions(questions)));
    }

    [HttpPost("{id:int}/answer")]
    public async Task<IActionResult> SaveAnswer(
        int id,
        [FromBody] SaveExamAnswerRequest request,
        CancellationToken cancellationToken)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        var attempt = await _db.ExamAttempts
            .SingleOrDefaultAsync(x => x.Id == id && x.StudentId == studentId, cancellationToken);

        if (attempt is null)
            return NotFound(new { message = "جلسة الاختبار غير موجودة." });

        if (attempt.Completed)
            return Conflict(new { message = "تم إنهاء هذا الاختبار." });

        var now = DateTime.UtcNow;
        if (attempt.ExpiresAt <= now)
        {
            attempt.Completed = true;
            attempt.CompletedAt = now;
            await _db.SaveChangesAsync(cancellationToken);
            return Conflict(new { message = "انتهى وقت الاختبار." });
        }

        if (!attempt.QuestionIds.Contains(request.QuestionId))
            return BadRequest(new { message = "السؤال لا ينتمي إلى جلسة الاختبار الحالية." });

        var question = await _db.Questions.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.QuestionId, cancellationToken);

        if (question is null)
            return BadRequest(new { message = "السؤال غير موجود." });

        if (request.SelectedAnswerIndex < 0 ||
            request.SelectedAnswerIndex >= question.Options.Count)
            return BadRequest(new { message = "الإجابة المختارة غير صالحة." });

        var answers = ParseAnswers(attempt.AnswersJson);
        answers[request.QuestionId] = request.SelectedAnswerIndex;
        attempt.AnswersJson = JsonSerializer.Serialize(answers);
        attempt.Answered = answers.Count;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { saved = true, answered = attempt.Answered, expiresAt = attempt.ExpiresAt });
    }

    [HttpPost("{id:int}/submit")]
    public async Task<ActionResult<ExamSubmissionResponse>> Submit(
        int id,
        [FromBody] SubmitExamAttemptRequest? request,
        CancellationToken cancellationToken)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        var attempt = await _db.ExamAttempts
            .SingleOrDefaultAsync(x => x.Id == id && x.StudentId == studentId, cancellationToken);

        if (attempt is null)
            return NotFound(new { message = "جلسة الاختبار غير موجودة." });

        if (attempt.Completed)
            return Conflict(new { message = "تم إنهاء هذا الاختبار مسبقاً." });

        var now = DateTime.UtcNow;
        var answers = ParseAnswers(attempt.AnswersJson);

        if (attempt.ExpiresAt > now && request?.Answers is not null)
        {
            foreach (var pair in request.Answers)
                answers[pair.Key] = pair.Value;
        }

        if (answers.Keys.Any(qid => !attempt.QuestionIds.Contains(qid)))
            return BadRequest(new { message = "توجد إجابة لسؤال خارج جلسة الاختبار." });

        var questionRows = await _db.Questions.AsNoTracking()
            .Where(q => attempt.QuestionIds.Contains(q.Id))
            .ToListAsync(cancellationToken);

        if (questionRows.Count != ExamQuestionCount)
            return Conflict(new { message = "تغير بنك الأسئلة ولم تعد جلسة الاختبار صالحة." });

        var questionById = questionRows.ToDictionary(q => q.Id);
        var orderedQuestions = attempt.QuestionIds
            .Select(questionId => questionById.TryGetValue(questionId, out var question) ? question : null)
            .Where(q => q is not null)
            .Cast<Question>()
            .ToList();

        if (orderedQuestions.Count != ExamQuestionCount)
            return Conflict(new { message = "لم تعد جميع أسئلة الجلسة متاحة." });

        if (answers.Any(pair =>
            !questionById.TryGetValue(pair.Key, out var question) ||
            pair.Value < 0 ||
            pair.Value >= question.Options.Count))
        {
            return BadRequest(new { message = "توجد إجابة غير صالحة داخل جلسة الاختبار." });
        }

        await _generationJobs.AttachStudentMediaUrlsAsync(
            orderedQuestions, cancellationToken, includeUnapprovedAiImages: false);

        var correct = 0;
        var wrongIds = new List<int>();

        foreach (var question in orderedQuestions)
        {
            if (answers.TryGetValue(question.Id, out var chosen) &&
                chosen == question.CorrectAnswerIndex)
                correct++;
            else if (answers.ContainsKey(question.Id))
                wrongIds.Add(question.Id);
        }

        attempt.AnswersJson = JsonSerializer.Serialize(answers);
        attempt.Answered = answers.Count;
        attempt.Correct = correct;
        attempt.Total = ExamQuestionCount;
        attempt.WrongQuestionIds = wrongIds;
        attempt.Completed = true;
        attempt.CompletedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(await BuildSubmissionResponseAsync(attempt, cancellationToken));
    }

    [HttpGet("{id:int}/result")]
    public async Task<ActionResult<ExamSubmissionResponse>> GetResult(
        int id,
        CancellationToken cancellationToken)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        var attempt = await _db.ExamAttempts
            .SingleOrDefaultAsync(x => x.Id == id && x.StudentId == studentId, cancellationToken);

        if (attempt is null)
            return NotFound(new { message = "جلسة الاختبار غير موجودة." });

        if (!attempt.Completed)
            return Conflict(new { message = "نتيجة الاختبار غير متاحة قبل الإنهاء." });

        return Ok(await BuildSubmissionResponseAsync(attempt, cancellationToken));
    }

    private async Task<ExamSubmissionResponse> BuildSubmissionResponseAsync(
        ExamAttempt attempt,
        CancellationToken cancellationToken)
    {
        var answers = ParseAnswers(attempt.AnswersJson);

        var questionRows = await _db.Questions.AsNoTracking()
            .Where(q => attempt.QuestionIds.Contains(q.Id))
            .ToListAsync(cancellationToken);

        if (questionRows.Count != ExamQuestionCount)
            throw new InvalidOperationException("Stored exam result no longer contains 30 valid questions.");

        var questionById = questionRows.ToDictionary(q => q.Id);
        var orderedQuestions = attempt.QuestionIds
            .Select(questionId => questionById.TryGetValue(questionId, out var question) ? question : null)
            .Where(q => q is not null)
            .Cast<Question>()
            .ToList();

        if (orderedQuestions.Count != ExamQuestionCount)
            throw new InvalidOperationException("Stored exam result no longer contains all 30 questions.");

        if (answers.Any(pair =>
            !questionById.TryGetValue(pair.Key, out var question) ||
            pair.Value < 0 ||
            pair.Value >= question.Options.Count))
        {
            throw new InvalidOperationException("Stored exam result contains an invalid answer.");
        }

        await _generationJobs.AttachStudentMediaUrlsAsync(
            orderedQuestions, cancellationToken, includeUnapprovedAiImages: false);

        var review = orderedQuestions.Select(question =>
            new ExamReviewQuestionResponse(
                question.Id,
                question.Text,
                question.Options,
                question.CorrectAnswerIndex,
                answers.TryGetValue(question.Id, out var chosen) ? chosen : null,
                question.Explanation,
                question.ImageUrl,
                question.DiagramType,
                question.DiagramUrl,
                question.DiagramTitle,
                question.DiagramDescription,
                question.AiImageUrl)).ToList();

        return new ExamSubmissionResponse(
            attempt.Id, attempt.ModelId, attempt.Correct, attempt.Total,
            attempt.Answered, attempt.WrongQuestionIds, attempt.CreatedAt, review);
    }

    private static bool IsActiveAttemptConflict(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgres &&
               string.Equals(postgres.SqlState, PostgresErrorCodes.UniqueViolation, StringComparison.Ordinal) &&
               string.Equals(postgres.ConstraintName, "UX_ExamAttempts_StudentId_Active", StringComparison.Ordinal);
    }

    private async Task<ExamSessionResponse> BuildSessionResponseAsync(
        ExamAttempt attempt,
        CancellationToken cancellationToken)
    {
        var answers = ParseAnswers(attempt.AnswersJson);

        var questionRows = await _db.Questions.AsNoTracking()
            .Where(q => attempt.QuestionIds.Contains(q.Id))
            .ToListAsync(cancellationToken);

        var questionById = questionRows.ToDictionary(q => q.Id);
        var orderedQuestions = attempt.QuestionIds
            .Select(id => questionById.TryGetValue(id, out var question) ? question : null)
            .Where(q => q is not null)
            .Cast<Question>()
            .ToList();

        if (orderedQuestions.Count != ExamQuestionCount)
            throw new InvalidOperationException("Stored exam session no longer contains 30 valid questions.");

        await _generationJobs.AttachStudentMediaUrlsAsync(
            orderedQuestions, cancellationToken, includeUnapprovedAiImages: false);

        return new ExamSessionResponse(
            attempt.Id, attempt.ModelId, attempt.ExpiresAt,
            answers, BuildSessionQuestions(orderedQuestions));
    }

    private static List<ExamSessionQuestionResponse> BuildSessionQuestions(IEnumerable<Question> questions) =>
        questions.Select(q => new ExamSessionQuestionResponse(
            q.Id, q.Text, q.Options, q.ImageUrl, q.DiagramType, q.DiagramUrl,
            q.DiagramTitle, q.DiagramDescription, q.AudioUrl, q.AiImageUrl)).ToList();

    private static Dictionary<int, int> ParseAnswers(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<int, int>();

        try
        {
            return JsonSerializer.Deserialize<Dictionary<int, int>>(json)
                   ?? new Dictionary<int, int>();
        }
        catch (JsonException)
        {
            return new Dictionary<int, int>();
        }
    }
}
