using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
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

```
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
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            FullName = request.FullName,
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
        if (request.Options.Count < 2 ||
            request.Options.Count > 6)
        {
            return BadRequest(new
            {
                message = "يجب أن يحتوي السؤال على 2 إلى 6 إجابات."
            });
        }

        if (request.CorrectAnswerIndex < 0 ||
            request.CorrectAnswerIndex >= request.Options.Count)
        {
            return BadRequest(new
            {
                message = "رقم الإجابة الصحيحة غير صالح."
            });
        }

        var q = FromRequest(request);

        _db.Questions.Add(q);

        await _db.SaveChangesAsync();

        return Ok(q);
    }

    [HttpPut("questions/{id:int}")]
    public async Task<ActionResult<Question>> UpdateQuestion(
        int id,
        QuestionUpsertRequest request)
    {
        var q =
            await _db.Questions.FindAsync(id);

        if (q is null)
            return NotFound();

        if (request.Options.Count < 2 ||
            request.Options.Count > 6 ||
            request.CorrectAnswerIndex < 0 ||
            request.CorrectAnswerIndex >= request.Options.Count)
        {
            return BadRequest(new
            {
                message = "بيانات الإجابات غير صالحة."
            });
        }

        q.Category = request.Category;
        q.Text = request.Text;
        q.Options = request.Options;
        q.CorrectAnswerIndex =
            request.CorrectAnswerIndex;
        q.Explanation = request.Explanation;
        q.ImageUrl = request.ImageUrl;
        q.DiagramType = request.DiagramType;
        q.DiagramUrl = request.DiagramUrl;
        q.DiagramTitle = request.DiagramTitle;
        q.DiagramDescription =
            request.DiagramDescription;

        await _db.SaveChangesAsync();

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

        return NoContent();
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics()
    {
        var students =
            await _userManager.GetUsersInRoleAsync("Student");

        var questionCounts =
            await _db.Questions
                .AsNoTracking()
                .GroupBy(q => q.Category)
                .Select(g => new
                {
                    Category = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

        var totalReferenced =
            await _db.Questions
                .AsNoTracking()
                .CountAsync(q =>
                    q.ImageUrl != null &&
                    q.ImageUrl != "");

        var legacyExams =
            await _db.ExamResults
                .AsNoTracking()
                .ToListAsync();

        var attemptsData =
            await _db.ExamAttempts
                .AsNoTracking()
                .ToListAsync();

        var examTotal =
            legacyExams.Count +
            attemptsData.Count;

        var passedTotal =
            legacyExams.Count(x => x.Passed) +
            attemptsData.Count(x => x.Correct >= 25);

        var scoreTotal =
            legacyExams.Sum(x => (double)x.Correct) +
            attemptsData.Sum(x => (double)x.Correct);

        var authTotal =
            await _db.AuthLogs.CountAsync();

        var authSuccess =
            await _db.AuthLogs.CountAsync(
                x => x.Success);

        // المخطط الحالي لا يحفظ إجابات كل سؤال على حدة،
        // لذلك نعرض آخر الأسئلة بدلاً من اختلاق إحصائيات غير موجودة.
        var top =
            await _db.Questions
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
                    Ser = questionCounts
                        .Where(x =>
                            x.Category ==
                            QuestionCategory.Ser)
                        .Select(x => x.Count)
                        .FirstOrDefault(),

                    Ishara = questionCounts
                        .Where(x =>
                            x.Category ==
                            QuestionCategory.Ishara)
                        .Select(x => x.Count)
                        .FirstOrDefault(),

                    Mechanic = questionCounts
                        .Where(x =>
                            x.Category ==
                            QuestionCategory.Mechanic)
                        .Select(x => x.Count)
                        .FirstOrDefault()
                }
            },

            media = new
            {
                totalReferenced
            },

            exams = new
            {
                total = examTotal,
                passed = passedTotal,

                passRate =
                    examTotal == 0
                        ? 0
                        : Math.Round(
                            passedTotal * 100.0 /
                            examTotal,
                            1),

                averageScore =
                    examTotal == 0
                        ? 0
                        : Math.Round(
                            scoreTotal /
                            examTotal,
                            1)
            },

            auth = new
            {
                totalAttempts = authTotal,
                successful = authSuccess,
                failed = authTotal - authSuccess
            },

            topQuestions = top
        });
    }

    private static Question FromRequest(
        QuestionUpsertRequest r)
    {
        return new Question
        {
            Category = r.Category,
            Text = r.Text,
            Options = r.Options,
            CorrectAnswerIndex =
                r.CorrectAnswerIndex,
            Explanation = r.Explanation,
            ImageUrl = r.ImageUrl,
            DiagramType = r.DiagramType,
            DiagramUrl = r.DiagramUrl,
            DiagramTitle = r.DiagramTitle,
            DiagramDescription =
                r.DiagramDescription
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
```

}
