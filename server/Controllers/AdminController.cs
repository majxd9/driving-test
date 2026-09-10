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
    private readonly IWebHostEnvironment _env;

    public AdminController(UserManager<ApplicationUser> userManager, AppDbContext db, IWebHostEnvironment env)
    {
        _userManager = userManager;
        _db = db;
        _env = env;
    }

    [HttpGet("students")]
    public async Task<ActionResult<List<StudentResponse>>> GetAllStudents()
    {
        var students = await _userManager.GetUsersInRoleAsync("Student");
        return Ok(students.Select(ToResponse).OrderByDescending(s => s.CreatedAt).ToList());
    }

    [HttpPost("students")]
    public async Task<ActionResult<StudentResponse>> CreateStudent(CreateStudentRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            FullName = request.FullName,
            IsActive = true,
            AccessExpiresAt = request.AccessDays is int days ? DateTime.UtcNow.AddDays(days) : null
        };
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));
        await _userManager.AddToRoleAsync(user, "Student");
        return Ok(ToResponse(user));
    }

    [HttpPatch("students/{id}/status")]
    public async Task<IActionResult> SetStatus(string id, UpdateStudentStatusRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        user.IsActive = request.IsActive;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpPost("students/{id}/reset-device")]
    public async Task<IActionResult> ResetDevice(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        user.DeviceId = null;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpDelete("students/{id}")]
    public async Task<IActionResult> DeleteStudent(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        await _userManager.DeleteAsync(user);
        return NoContent();
    }

    [HttpGet("students/{id}/logs")]
    public async Task<ActionResult<List<AuthLog>>> GetLogs(string id)
    {
        var logs = await _db.AuthLogs.Where(l => l.UserId == id).OrderByDescending(l => l.Timestamp).Take(50).ToListAsync();
        return Ok(logs);
    }

    [HttpGet("questions")]
    public async Task<ActionResult<List<Question>>> GetQuestions() => Ok(await _db.Questions.AsNoTracking().OrderBy(q => q.Id).ToListAsync());

    [HttpPost("questions")]
    public async Task<ActionResult<Question>> CreateQuestion(QuestionUpsertRequest request)
    {
        if (request.Options.Count < 2 || request.Options.Count > 6) return BadRequest(new { message = "يجب أن يحتوي السؤال على 2 إلى 6 إجابات." });
        if (request.CorrectAnswerIndex < 0 || request.CorrectAnswerIndex >= request.Options.Count) return BadRequest(new { message = "رقم الإجابة الصحيحة غير صالح." });
        var q = FromRequest(request);
        _db.Questions.Add(q);
        await _db.SaveChangesAsync();
        return Ok(q);
    }

    [HttpPut("questions/{id:int}")]
    public async Task<ActionResult<Question>> UpdateQuestion(int id, QuestionUpsertRequest request)
    {
        var q = await _db.Questions.FindAsync(id);
        if (q is null) return NotFound();
        if (request.Options.Count < 2 || request.Options.Count > 6 || request.CorrectAnswerIndex < 0 || request.CorrectAnswerIndex >= request.Options.Count)
            return BadRequest(new { message = "بيانات الإجابات غير صالحة." });
        q.Category = request.Category; q.Text = request.Text; q.Options = request.Options; q.CorrectAnswerIndex = request.CorrectAnswerIndex;
        q.Explanation = request.Explanation; q.ImageUrl = request.ImageUrl; q.DiagramType = request.DiagramType; q.DiagramUrl = request.DiagramUrl;
        q.DiagramTitle = request.DiagramTitle; q.DiagramDescription = request.DiagramDescription;
        await _db.SaveChangesAsync();
        return Ok(q);
    }

    [HttpDelete("questions/{id:int}")]
    public async Task<IActionResult> DeleteQuestion(int id)
    {
        var q = await _db.Questions.FindAsync(id);
        if (q is null) return NotFound();
        _db.Questions.Remove(q); await _db.SaveChangesAsync(); return NoContent();
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics()
    {
        var students = await _userManager.GetUsersInRoleAsync("Student");
        var questionCounts = await _db.Questions.AsNoTracking().GroupBy(q => q.Category).Select(g => new { Category = g.Key, Count = g.Count() }).ToListAsync();
        var totalReferenced = await _db.Questions.AsNoTracking().CountAsync(q => q.ImageUrl != null && q.ImageUrl != "");
        var exams = await _db.ExamResults.AsNoTracking().ToListAsync();
        var authTotal = await _db.AuthLogs.CountAsync();
        var authSuccess = await _db.AuthLogs.CountAsync(x => x.Success);
        var attempts = new Dictionary<int,(Question q,int attempts,int correct)>();
        // Current schema does not persist per-question answers, so topQuestions reports content inventory rather than invented performance.
        var top = await _db.Questions.AsNoTracking().OrderByDescending(q => q.Id).Take(8).Select(q => new { questionId=q.Id, category=q.Category, text=q.Text, attempts=0, correct=0, accuracy=0 }).ToListAsync();
        return Ok(new {
            students = new { total = students.Count, active = students.Count(s => s.IsActive) },
            questions = new { total = questionCounts.Sum(x=>x.Count), byCategory = new { Ser=questionCounts.Where(x=>x.Category==QuestionCategory.Ser).Select(x=>x.Count).FirstOrDefault(), Ishara=questionCounts.Where(x=>x.Category==QuestionCategory.Ishara).Select(x=>x.Count).FirstOrDefault(), Mechanic=questionCounts.Where(x=>x.Category==QuestionCategory.Mechanic).Select(x=>x.Count).FirstOrDefault() } },
            media = new { totalReferenced },
            exams = new { total=exams.Count, passed=exams.Count(x=>x.Passed), passRate=exams.Count==0?0:Math.Round(exams.Count(x=>x.Passed)*100.0/exams.Count,1), averageScore=exams.Count==0?0:Math.Round(exams.Average(x=>(double)x.Correct),1) },
            auth = new { totalAttempts=authTotal, successful=authSuccess, failed=authTotal-authSuccess },
            topQuestions=top
        });
    }

    [HttpPost("media")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadMedia(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "لم يتم اختيار ملف." });
        var allowed = new[] { "image/webp", "image/png", "image/jpeg", "image/svg+xml" };
        if (!allowed.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase)) return BadRequest(new { message = "الصيغ المدعومة: WebP, PNG, JPG, SVG." });
        var ext = file.ContentType switch { "image/webp" => ".webp", "image/png" => ".png", "image/jpeg" => ".jpg", _ => ".svg" };
        var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
        Directory.CreateDirectory(folder);
        var name = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(folder, name);
        await using var stream = System.IO.File.Create(path); await file.CopyToAsync(stream);
        return Ok(new { url = $"{Request.Scheme}://{Request.Host}/uploads/{name}", size = file.Length, width = 0, height = 0 });
    }

    private static Question FromRequest(QuestionUpsertRequest r) => new() { Category=r.Category, Text=r.Text, Options=r.Options, CorrectAnswerIndex=r.CorrectAnswerIndex, Explanation=r.Explanation, ImageUrl=r.ImageUrl, DiagramType=r.DiagramType, DiagramUrl=r.DiagramUrl, DiagramTitle=r.DiagramTitle, DiagramDescription=r.DiagramDescription };
    private static StudentResponse ToResponse(ApplicationUser u) => new(u.Id,u.UserName??"",u.FullName,u.IsActive,!string.IsNullOrEmpty(u.DeviceId),u.AccessExpiresAt,u.CreatedAt);
}
