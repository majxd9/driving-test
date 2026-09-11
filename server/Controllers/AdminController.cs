using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/admin/students")]
[Authorize(Roles = "Admin")] // ولا Endpoint هون يوصله إلا حساب Admin
public class AdminController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public AdminController(UserManager<ApplicationUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<StudentResponse>>> GetAll()
    {
        var students = await _userManager.GetUsersInRoleAsync("Student");
        var studentIds = students.Select(s => s.Id).ToHashSet();

        var attemptStats = await _db.ExamAttempts
            .Where(a => studentIds.Contains(a.StudentId))
            .GroupBy(a => a.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                AttemptCount = g.Count(),
                PassCount = g.Count(a => a.Correct >= PassScore),
            })
            .ToDictionaryAsync(g => g.StudentId);

        var result = students
            .Select(s => ToResponse(s, attemptStats.GetValueOrDefault(s.Id)?.AttemptCount ?? 0,
                                        attemptStats.GetValueOrDefault(s.Id)?.PassCount ?? 0))
            .OrderByDescending(s => s.CreatedAt)
            .ToList();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<StudentResponse>> Create(CreateStudentRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            FullName = request.FullName,
            IsActive = true,
            AccessExpiresAt = request.AccessDays is int days ? DateTime.UtcNow.AddDays(days) : null
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await _userManager.AddToRoleAsync(user, "Student");
        return Ok(ToResponse(user, 0, 0));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, UpdateStudentStatusRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        user.IsActive = request.IsActive;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    // بيصفّر الجهاز المرتبط بالحساب — أول جهاز يسجّل دخول بعدها يصير هو الجهاز الجديد المرتبط.
    // مفيدة لما الطالب يبدّل جواله أو يشتكي إنه ما عم يقدر يدخل.
    [HttpPost("{id}/reset-device")]
    public async Task<IActionResult> ResetDevice(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        user.DeviceId = null;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        await _userManager.DeleteAsync(user);
        return NoContent();
    }

    [HttpGet("{id}/logs")]
    public async Task<ActionResult<List<AuthLog>>> GetLogs(string id)
    {
        var logs = await _db.AuthLogs
            .Where(l => l.UserId == id)
            .OrderByDescending(l => l.Timestamp)
            .Take(50)
            .ToListAsync();
        return Ok(logs);
    }

    [HttpGet("{id}/attempts")]
    public async Task<ActionResult<List<ExamAttemptResponse>>> GetAttempts(string id)
    {
        var attempts = await _db.ExamAttempts
            .Where(a => a.StudentId == id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(attempts.Select(ExamAttemptsController.ToResponse).ToList());
    }

    private const int PassScore = 25;

    private static StudentResponse ToResponse(ApplicationUser u, int attemptCount, int passCount) => new(
        u.Id, u.UserName ?? "", u.FullName, u.IsActive,
        !string.IsNullOrEmpty(u.DeviceId), u.AccessExpiresAt, u.CreatedAt,
        attemptCount, passCount);
}
