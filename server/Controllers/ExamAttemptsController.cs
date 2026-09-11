using System.Security.Claims;
using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/exam-attempts")]
[Authorize] // أي طالب مسجّل دخول يقدر يحفظ نتيجة اختباره هو بس (ما بنستقبل StudentId من الفرونت اند)
public class ExamAttemptsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExamAttemptsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<ActionResult<ExamAttemptResponse>> Submit(SubmitExamAttemptRequest request)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId is null) return Unauthorized();

        var attempt = new ExamAttempt
        {
            StudentId = studentId,
            ModelId = request.ModelId,
            Correct = request.Correct,
            Total = request.Total,
            Answered = request.Answered,
            WrongQuestionIds = request.WrongQuestionIds,
            CreatedAt = DateTime.UtcNow,
        };

        _db.ExamAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        return Ok(ToResponse(attempt));
    }

    internal static ExamAttemptResponse ToResponse(ExamAttempt a) => new(
        a.Id, a.ModelId, a.Correct, a.Total, a.Answered, a.WrongQuestionIds, a.CreatedAt);
}
