using System.Security.Claims;
using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize(Roles = "Student")]
public class ExamResultsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExamResultsController(AppDbContext db) => _db = db;

    [HttpPost("results")]
    public async Task<IActionResult> Save(ExamResultRequest request)
    {
        if (request.ModelId is < 1 or > 8 || request.Total != 30)
            return BadRequest(new { message = "بيانات النتيجة غير صالحة." });

        if (request.Correct < 0 || request.Correct > request.Total ||
            request.Answered < 0 || request.Answered > request.Total)
            return BadRequest(new { message = "بيانات النتيجة غير صالحة." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        _db.ExamResults.Add(new ExamResult
        {
            UserId = userId,
            ModelId = request.ModelId,
            Total = request.Total,
            Correct = request.Correct,
            Answered = request.Answered,
            Passed = request.Correct >= 25
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
