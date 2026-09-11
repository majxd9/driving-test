using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize] // لازم تسجيل دخول صالح — بلا توكن ما في ولا سؤال واحد بيرجع
public class QuestionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public QuestionsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<Question>>> GetByCategory([FromQuery] QuestionCategory category)
    {
        var questions = await _db.Questions
            .Where(q => q.Category == category)
            .AsNoTracking()
            .ToListAsync();
        return Ok(questions);
    }
}
