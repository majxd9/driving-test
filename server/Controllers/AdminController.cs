using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

public AdminController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    [HttpGet("students")]
    public async Task<ActionResult<List<StudentResponse>>> GetAllStudents()
    {
        var students = await _userManager.GetUsersInRoleAsync("Student");
        var ids = students.Select(s => s.Id).ToHashSet();

        var stats = await _db.ExamAttempts
            .Where(a => ids.Contains(a.StudentId))
            .GroupBy(a => a.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                Attempts = g.Count(),
                Passed = g.Count(a => a.Correct >= 25)
            })
            .ToDictionaryAsync(x => x.StudentId);

        return Ok(
            students
                .Select(s =>
                {
                    stats.TryGetValue(s.Id, out var st);

                    return ToResponse(
                        s,
                        st?.Attempts ?? 0,
                        st?.Passed ?? 0);
                })
                .OrderByDescending(s => s.CreatedAt)
                .ToList());
    }

    [HttpPost("students")]
    public async Task<ActionResult<StudentResponse>> CreateStudent(
        CreateStudentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || request.UserName.Length > 64 ||
            string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Length > 120 ||
            string.IsNullOrWhiteSpace(request.Password) || request.Password.Length > 128 ||
            request.AccessDays is <= 0 or > 3650)
        {
            return BadRequest(new { message = "بيانات الطالب غير صالحة." });
        }
        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            FullName = request.FullName.Trim(),
            IsActive = true,
            AccessExpiresAt =
                request.AccessDays is int days
                    ? DateTime.UtcNow.AddDays(days)
                    : null
        };

        var result =
            await _userManager.CreateAsync(
                user,
                request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(
                result.Errors.Select(e => e.Description));
        }

        var roleResult =
            await _userManager.AddToRoleAsync(
                user,
                "Student");

        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);

            return BadRequest(
                roleResult.Errors.Select(e => e.Description));
        }

        return Ok(ToResponse(user));
    }

    [HttpPatch("students/{id}/status")]
    public async Task<IActionResult> SetStatus(
        string id,
        UpdateStudentStatusRequest request)
    {
        var user =
            await _userManager.FindByIdAsync(id);

        if (user is null)
            return NotFound();

        user.IsActive = request.IsActive;

        var result =
            await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            return BadRequest(
                result.Errors.Select(e => e.Description));
        }

        return NoContent();
    }

    [HttpPost("students/{id}/reset-device")]
    public async Task<IActionResult> ResetDevice(string id)
    {
        var user =
            await _userManager.FindByIdAsync(id);

        if (user is null)
            return NotFound();

        user.DeviceId = null;

        var result =
            await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            return BadRequest(
                result.Errors.Select(e => e.Description));
        }

        return NoContent();
    }

    [HttpDelete("students/{id}")]
    public async Task<IActionResult> DeleteStudent(string id)
    {
        var user =
            await _userManager.FindByIdAsync(id);

        if (user is null)
            return NotFound();

        var result =
            await _userManager.DeleteAsync(user);

        if (!result.Succeeded)
        {
            return BadRequest(
                result.Errors.Select(e => e.Description));
        }

        return NoContent();
    }

    [HttpGet("students/{id}/logs")]
    public async Task<ActionResult<List<AuthLog>>> GetLogs(
        string id)
    {
        var logs = await _db.AuthLogs
            .Where(l => l.UserId == id)
            .OrderByDescending(l => l.Timestamp)
            .Take(50)
            .ToListAsync();

        return Ok(logs);
    }

    [HttpGet("students/{id}/attempts")]
    public async Task<ActionResult<List<ExamAttemptResponse>>> GetAttempts(
        string id)
    {
        var attempts = await _db.ExamAttempts
            .AsNoTracking()
            .Where(a => a.StudentId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Ok(
            attempts
                .Select(a => new ExamAttemptResponse(
                    a.Id,
                    a.ModelId,
                    a.Correct,
                    a.Total,
                    a.Answered,
                    a.WrongQuestionIds,
                    a.CreatedAt))
                .ToList());
    }

    [HttpGet("questions")]
    public async Task<ActionResult<List<Question>>> GetQuestions()
    {
        return Ok(
            await _db.Questions
                .AsNoTracking()
                .OrderBy(q => q.Id)
                .ToListAsync());
    }

    [HttpPost("questions")]
    public async Task<ActionResult<Question>> CreateQuestion(
        QuestionUpsertRequest request)
    {
        var validation = ValidateQuestionRequest(request);
        if (validation is not null)
            return BadRequest(new { message = validation });

        var q = FromRequest(request);
        _db.Questions.Add(q);

        await _db.SaveChangesAsync();
        QuestionCountCache.ApplyChanges(added: 1, deleted: 0);
        QuestionBankCache.Invalidate();

        return Ok(q);
    }

    [HttpPut("questions/{id:int}")]
    public async Task<ActionResult<Question>> UpdateQuestion(
        int id,
        QuestionUpsertRequest request)
    {
        var q = await _db.Questions.FindAsync(id);
        if (q is null)
            return NotFound();

        var validation = ValidateQuestionRequest(request);
        if (validation is not null)
            return BadRequest(new { message = validation });

        q.Category = request.Category;
        q.Text = request.Text.Trim();
        q.Options = request.Options.Select(x => x.Trim()).ToList();
        q.CorrectAnswerIndex = request.CorrectAnswerIndex;
        q.Explanation = request.Explanation?.Trim();
        q.ImageUrl = request.ImageUrl?.Trim();
        q.DiagramType = request.DiagramType?.Trim();
        q.DiagramUrl = request.DiagramUrl?.Trim();
        q.DiagramTitle = request.DiagramTitle?.Trim();
        q.DiagramDescription = request.DiagramDescription?.Trim();

        await _db.SaveChangesAsync();
        QuestionBankCache.Invalidate();

        return Ok(q);
    }

    [HttpDelete("questions/{id:int}")]
    public async Task<IActionResult> DeleteQuestion(int id)
    {
        var q =
            await _db.Questions.FindAsync(id);

        if (q is null)
            return NotFound();

        _db.Questions.Remove(q);

        await _db.SaveChangesAsync();
        QuestionCountCache.ApplyChanges(added: 0, deleted: 1);
        QuestionBankCache.Invalidate();

        return NoContent();
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics()
    {
        var students = await _userManager.GetUsersInRoleAsync("Student");

        var questionCounts = await _db.Questions
            .AsNoTracking()
            .GroupBy(q => q.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        var totalReferenced = await _db.Questions
            .AsNoTracking()
            .CountAsync(q => q.ImageUrl != null && q.ImageUrl != "");

        var legacy = await _db.ExamResults
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Passed = g.Count(x => x.Passed),
                Score = g.Sum(x => (double?)x.Correct) ?? 0
            })
            .FirstOrDefaultAsync();

        var attempts = await _db.ExamAttempts
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Passed = g.Count(x => x.Correct >= 25),
                Score = g.Sum(x => (double?)x.Correct) ?? 0
            })
            .FirstOrDefaultAsync();

        var auth = await _db.AuthLogs
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Successful = g.Count(x => x.Success)
            })
            .FirstOrDefaultAsync();

        var examTotal = (legacy?.Total ?? 0) + (attempts?.Total ?? 0);
        var passedTotal = (legacy?.Passed ?? 0) + (attempts?.Passed ?? 0);
        var scoreTotal = (legacy?.Score ?? 0) + (attempts?.Score ?? 0);
        var authTotal = auth?.Total ?? 0;
        var authSuccess = auth?.Successful ?? 0;

        // لا توجد إجابات لكل سؤال مخزنة في قاعدة البيانات حالياً،
        // لذلك لا نختلق إحصائيات سؤال-بسؤال.
        var top = await _db.Questions
            .AsNoTracking()
            .OrderByDescending(q => q.Id)
            .Take(8)
            .Select(q => new
            {
                questionId = q.Id,
                category = q.Category,
                text = q.Text,
                attempts = 0,
                correct = 0,
                accuracy = 0
            })
            .ToListAsync();

        return Ok(new
        {
            students = new
            {
                total = students.Count,
                active = students.Count(s => s.IsActive)
            },
            questions = new
            {
                total = questionCounts.Sum(x => x.Count),
                byCategory = new
                {
                    Ser = questionCounts.Where(x => x.Category == QuestionCategory.Ser).Select(x => x.Count).FirstOrDefault(),
                    Ishara = questionCounts.Where(x => x.Category == QuestionCategory.Ishara).Select(x => x.Count).FirstOrDefault(),
                    Mechanic = questionCounts.Where(x => x.Category == QuestionCategory.Mechanic).Select(x => x.Count).FirstOrDefault()
                }
            },
            media = new { totalReferenced },
            exams = new
            {
                total = examTotal,
                passed = passedTotal,
                passRate = examTotal == 0 ? 0 : Math.Round(passedTotal * 100.0 / examTotal, 1),
                averageScore = examTotal == 0 ? 0 : Math.Round(scoreTotal / examTotal, 1)
            },
            auth = new { totalAttempts = authTotal, successful = authSuccess, failed = authTotal - authSuccess },
            topQuestions = top
        });
    }

    private static string? ValidateQuestionRequest(QuestionUpsertRequest request)
    {
        if (request is null)
            return "بيانات السؤال غير صالحة.";

        if (!Enum.IsDefined(request.Category))
            return "قسم السؤال غير صالح.";

        if (string.IsNullOrWhiteSpace(request.Text) || request.Text.Length > 1500)
            return "نص السؤال غير صالح.";

        if (request.Options is null ||
            request.Options.Count != 4 ||
            request.Options.Any(o => string.IsNullOrWhiteSpace(o) || o.Length > 500))
            return "يجب أن يحتوي السؤال على 4 إجابات غير فارغة.";

        if (request.Options.Distinct(StringComparer.Ordinal).Count() != 4)
            return "يجب ألا تتكرر الإجابات.";

        if (request.CorrectAnswerIndex < 0 ||
            request.CorrectAnswerIndex >= request.Options.Count)
            return "رقم الإجابة الصحيحة غير صالح.";

        if (!IsSafeAssetPath(request.ImageUrl) || !IsSafeAssetPath(request.DiagramUrl))
            return "مسار الصورة غير صالح.";

        return null;
    }

    private static bool IsSafeAssetPath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        var trimmed = value.Trim();
        return trimmed.StartsWith("/", StringComparison.Ordinal) &&
               !trimmed.Contains("..", StringComparison.Ordinal) &&
               !trimmed.Contains("\\", StringComparison.Ordinal) &&
               !trimmed.Contains("://", StringComparison.Ordinal) &&
               !trimmed.StartsWith("//", StringComparison.Ordinal);
    }

    private static Question FromRequest(QuestionUpsertRequest r)
    {
        return new Question
        {
            Category = r.Category,
            Text = r.Text.Trim(),
            Options = r.Options.Select(x => x.Trim()).ToList(),
            CorrectAnswerIndex = r.CorrectAnswerIndex,
            Explanation = r.Explanation?.Trim(),
            ImageUrl = r.ImageUrl?.Trim(),
            DiagramType = r.DiagramType?.Trim(),
            DiagramUrl = r.DiagramUrl?.Trim(),
            DiagramTitle = r.DiagramTitle?.Trim(),
            DiagramDescription = r.DiagramDescription?.Trim()
        };
    }

    private static StudentResponse ToResponse(
        ApplicationUser u,
        int attemptCount = 0,
        int passCount = 0)
    {
        return new StudentResponse(
            u.Id,
            u.UserName ?? "",
            u.FullName,
            u.IsActive,
            !string.IsNullOrEmpty(u.DeviceId),
            u.AccessExpiresAt,
            u.CreatedAt,
            attemptCount,
            passCount);
    }

}
