using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly AiGenerationJobService _generationJobs;
    private readonly IMemoryCache _memoryCache;

    public AdminController(
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        AiGenerationJobService generationJobs,
        IMemoryCache memoryCache)
    {
        _userManager = userManager;
        _db = db;
        _generationJobs = generationJobs;
        _memoryCache = memoryCache;
    }

    [HttpGet("accounts")]
    public async Task<ActionResult<List<AccountResponse>>> GetAccounts()
    {
        var users = await _userManager.Users
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var result = new List<AccountResponse>(users.Count);

        foreach (var user in users)
        {
            var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? "Student";
            result.Add(ToAccountResponse(user, role));
        }

        return Ok(result);
    }

    [HttpPost("accounts")]
    public async Task<ActionResult<AccountResponse>> CreateAccount(CreateAccountRequest request)
    {
        var role = NormalizeAccountRole(request.Role);

        if (role is null)
            return BadRequest(new { message = "الصلاحية يجب أن تكون Student أو Admin." });

        if (string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "اسم المستخدم والاسم الكامل وكلمة المرور مطلوبة." });
        }

        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            FullName = request.FullName.Trim(),
            IsActive = true,
            AccessExpiresAt = NormalizeAccessExpiry(request.AccessExpiresAt)
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        var roleResult = await _userManager.AddToRoleAsync(user, role);

        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return BadRequest(roleResult.Errors.Select(e => e.Description));
        }

        return Ok(ToAccountResponse(user, role));
    }

    [HttpPut("accounts/{id}")]
    public async Task<ActionResult<AccountResponse>> UpdateAccount(
        string id,
        UpdateAccountRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);

        if (user is null)
            return NotFound(new { message = "الحساب غير موجود." });

        var requestedRole = NormalizeAccountRole(request.Role);
        if (requestedRole is null)
            return BadRequest(new { message = "الصلاحية يجب أن تكون Student أو Admin." });

        if (string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { message = "اسم المستخدم والاسم الكامل مطلوبان." });
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        var currentRole = currentRoles.FirstOrDefault() ?? "Student";
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.Equals(user.Id, currentUserId, StringComparison.Ordinal) &&
            (!request.IsActive || !string.Equals(requestedRole, currentRole, StringComparison.Ordinal)))
        {
            return BadRequest(new { message = "لا يمكن للأدمن تعطيل حسابه أو تغيير صلاحيته من داخل الجلسة الحالية." });
        }

        if (currentRole == "Admin" &&
            (!request.IsActive || !string.Equals(requestedRole, "Admin", StringComparison.Ordinal)))
        {
            var activeAdmins = (await _userManager.GetUsersInRoleAsync("Admin"))
                .Count(x => x.IsActive && x.Id != user.Id);

            if (activeAdmins == 0)
                return BadRequest(new { message = "يجب إبقاء أدمن نشط واحد على الأقل في النظام." });
        }

        user.UserName = request.UserName.Trim();
        user.FullName = request.FullName.Trim();
        user.IsActive = request.IsActive;
        user.AccessExpiresAt = NormalizeAccessExpiry(request.AccessExpiresAt);

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(updateResult.Errors.Select(e => e.Description));

        if (!string.Equals(currentRole, requestedRole, StringComparison.Ordinal))
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
                return BadRequest(removeResult.Errors.Select(e => e.Description));

            var addResult = await _userManager.AddToRoleAsync(user, requestedRole);
            if (!addResult.Succeeded)
                return BadRequest(addResult.Errors.Select(e => e.Description));
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var passwordResult = await _userManager.ResetPasswordAsync(user, token, request.Password);

            if (!passwordResult.Succeeded)
                return BadRequest(passwordResult.Errors.Select(e => e.Description));
        }

        _memoryCache.Remove($"auth-status:{user.Id}:Admin");
        _memoryCache.Remove($"auth-status:{user.Id}:Student");

        var finalRole = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? requestedRole;
        return Ok(ToAccountResponse(user, finalRole));
    }

    [HttpPost("accounts/{id}/reset-device")]
    public async Task<IActionResult> ResetAccountDevice(string id)
    {
        var user = await _userManager.FindByIdAsync(id);

        if (user is null)
            return NotFound(new { message = "الحساب غير موجود." });

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? "Student";
        if (role == "Admin")
            return BadRequest(new { message = "حساب الأدمن غير مرتبط بجهاز." });

        user.DeviceId = null;
        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return NoContent();
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

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault();
        if (!string.Equals(role, "Student", StringComparison.Ordinal))
            return BadRequest(new { message = "هذا المسار مخصص لحسابات الطلاب فقط." });

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

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault();
        if (!string.Equals(role, "Student", StringComparison.Ordinal))
            return BadRequest(new { message = "هذا المسار مخصص لحسابات الطلاب فقط." });

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

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault();
        if (!string.Equals(role, "Student", StringComparison.Ordinal))
            return BadRequest(new { message = "لا يمكن حذف حساب Admin عبر مسار الطلاب." });

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
        var questions = await _db.Questions
            .AsNoTracking()
            .OrderBy(q => q.Id)
            .ToListAsync();

        await _generationJobs.AttachAdminStateAsync(
            questions,
            HttpContext.RequestAborted);

        return Ok(questions);
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
        await _generationJobs.EnsureQuestionJobsAsync(
            q,
            cancellationToken: HttpContext.RequestAborted);
        QuestionCountCache.ApplyChanges(added: 1, deleted: 0);
        QuestionBankCache.Invalidate();

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
        await _generationJobs.EnsureQuestionJobsAsync(
            q,
            cancellationToken: HttpContext.RequestAborted);
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

    [HttpGet("questions/{id:int}/audio-status")]
    public async Task<IActionResult> GetQuestionAudioStatus(int id, CancellationToken cancellationToken)
    {
        var question = await _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        var audio = await _db.QuestionAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);

        var currentHash = QuestionAudioTextBuilder.GetCurrentHash(question);
        var legacyHash = QuestionAudioTextBuilder.GetLegacyHash(question);
        var hasBytes = audio is not null && audio.AudioBytes.Length > 0;
        var hashMatches = hasBytes && string.Equals(currentHash, audio!.ContentHash, StringComparison.Ordinal);

        return Ok(new
        {
            questionId = id,
            stored = audio is not null,
            bytes = audio?.AudioBytes.Length ?? 0,
            currentHash,
            storedHash = audio?.ContentHash,
            hashMatches = hasBytes &&
                          (string.Equals(currentHash, audio?.ContentHash, StringComparison.Ordinal) ||
                           string.Equals(legacyHash, audio?.ContentHash, StringComparison.Ordinal)),
            legacyHash,
            playable = hasBytes &&
                       (string.Equals(currentHash, audio?.ContentHash, StringComparison.Ordinal) ||
                        string.Equals(legacyHash, audio?.ContentHash, StringComparison.Ordinal)),
            audioUrl = hasBytes ? $"/api/questions/{id}/audio-play?v={audio!.ContentHash}" : null
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

    private static string? NormalizeAccountRole(string? role)
    {
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return "Admin";

        if (string.Equals(role, "Student", StringComparison.OrdinalIgnoreCase))
            return "Student";

        return null;
    }

    private static DateTime? NormalizeAccessExpiry(DateTime? value)
    {
        if (value is null)
            return null;

        var utc = value.Value.Kind == DateTimeKind.Utc
            ? value.Value
            : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);

        return utc.Date.AddDays(1).AddTicks(-1);
    }

    private static AccountResponse ToAccountResponse(ApplicationUser user, string role)
    {
        return new AccountResponse(
            user.Id,
            user.UserName ?? "",
            user.FullName,
            role,
            user.IsActive,
            !string.IsNullOrEmpty(user.DeviceId),
            user.AccessExpiresAt,
            user.CreatedAt);
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
