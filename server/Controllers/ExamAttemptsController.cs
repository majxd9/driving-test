using System.Security.Claims;
using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/exam-attempts")]
[Authorize(Roles = "Student")]
public class ExamAttemptsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExamAttemptsController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<ActionResult<ExamAttemptResponse>> Submit(SubmitExamAttemptRequest request)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        if (request.Total <= 0 || request.Total > 100 ||
            request.Correct < 0 || request.Correct > request.Total ||
            request.Answered < 0 || request.Answered > request.Total)
            return BadRequest(new { message = "بيانات نتيجة الاختبار غير صالحة." });

        var wrongIds = request.WrongQuestionIds?.Distinct().Take(100).ToList() ?? new List<int>();
        var attempt = new ExamAttempt
        {
            StudentId = studentId,
            ModelId = request.ModelId,
            Correct = request.Correct,
            Total = request.Total,
            Answered = request.Answered,
            WrongQuestionIds = wrongIds,
            CreatedAt = DateTime.UtcNow
        };

        _db.ExamAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        return Ok(new ExamAttemptResponse(
            attempt.Id, attempt.ModelId, attempt.Correct, attempt.Total,
            attempt.Answered, attempt.WrongQuestionIds, attempt.CreatedAt));
    }
}
