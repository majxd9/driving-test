using System.Security.Claims;
using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/exam-attempts")]
[Authorize(Roles = "Student")]
public class ExamAttemptsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AiGenerationJobService _generationJobs;

    public ExamAttemptsController(
        AppDbContext db,
        AiGenerationJobService generationJobs)
    {
        _db = db;
        _generationJobs = generationJobs;
    }

    [HttpPost]
    public async Task<ActionResult<ExamAttemptResponse>> Submit(SubmitExamAttemptRequest request)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        if (request.ModelId is < 1 or > 8 || request.Answers is null || request.Answers.Count > 30)
            return BadRequest(new { message = "بيانات الاختبار غير صالحة." });

        List<Question> examQuestions;
        try
        {
            examQuestions = await ExamQuestionPicker.GetAsync(_db, request.ModelId);
        }
        catch (Exception)
        {
            return Conflict(new { message = "تعذر التحقق من نموذج الاختبار حالياً." });
        }

        if (examQuestions.Count != 30)
            return Conflict(new { message = "تعذر التحقق من أسئلة الاختبار." });

        var expectedIds = examQuestions.Select(q => q.Id).ToHashSet();
        if (request.Answers.Keys.Any(id => !expectedIds.Contains(id)))
            return BadRequest(new { message = "توجد إجابات لأسئلة خارج نموذج الاختبار." });

        if (request.Answers.Values.Any(answer => answer < 0 || answer > 5))
            return BadRequest(new { message = "إحدى الإجابات غير صالحة." });

        var correct = 0;
        var answered = request.Answers.Count;
        var wrongIds = new List<int>();

        foreach (var question in examQuestions)
        {
            if (!request.Answers.TryGetValue(question.Id, out var selected))
                continue;

            if (selected < 0 || selected >= question.Options.Count)
                return BadRequest(new { message = "إحدى الإجابات غير صالحة." });

            if (selected == question.CorrectAnswerIndex)
                correct++;
            else
                wrongIds.Add(question.Id);
        }

        var attempt = new ExamAttempt
        {
            StudentId = studentId,
            ModelId = request.ModelId,
            Correct = correct,
            Total = examQuestions.Count,
            Answered = answered,
            WrongQuestionIds = wrongIds,
            CreatedAt = DateTime.UtcNow
        };

        _db.ExamAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        await _generationJobs.AttachStudentMediaUrlsAsync(
            examQuestions,
            HttpContext.RequestAborted);

        var reviewQuestions = examQuestions
            .Select(question => new ExamReviewQuestionResponse(
                question.Id,
                question.Text,
                question.Options,
                question.CorrectAnswerIndex,
                request.Answers.TryGetValue(question.Id, out var chosen) ? chosen : null,
                question.Explanation,
                question.ImageUrl,
                question.DiagramType,
                question.DiagramUrl,
                question.DiagramTitle,
                question.DiagramDescription,
                question.AiImageUrl))
            .ToList();

        return Ok(new ExamSubmissionResponse(
            attempt.Id, attempt.ModelId, attempt.Correct, attempt.Total,
            attempt.Answered, attempt.WrongQuestionIds, attempt.CreatedAt,
            reviewQuestions));
    }
}
