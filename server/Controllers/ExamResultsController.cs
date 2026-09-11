using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamResultsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExamResultsController(AppDbContext db) => _db = db;

    [HttpPost("results")]
    public async Task<IActionResult> Save(ExamResultRequest request)
    {
        var total = Math.Max(0, request.Total);
        var correct = Math.Clamp(request.Correct, 0, total);
        var answered = Math.Clamp(request.Answered, 0, total);
        _db.ExamResults.Add(new ExamResult
        {
            UserId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            ModelId = request.ModelId,
            Total = total,
            Correct = correct,
            Answered = answered,
            Passed = correct >= 25
        });
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
