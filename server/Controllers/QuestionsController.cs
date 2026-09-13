using DrivingTestApi.Data;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public QuestionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<Question>>> GetByCategory([FromQuery] QuestionCategory category)
    {
        var questions = await _db.Questions
            .AsNoTracking()
            .Where(q => q.Category == category)
            .ToListAsync();
        return Ok(questions);
    }

    [HttpGet("stats")]
    public ActionResult<object> GetStats()
        => Ok(new { total = QuestionCountCache.Total });

    [HttpGet("exam/{modelId:int}")]
    public async Task<ActionResult<List<Question>>> GetExam(int modelId)
    {
        if (modelId is < 1 or > 8)
            return BadRequest(new { message = "رقم النموذج يجب أن يكون بين 1 و8." });

        var serTask = _db.Questions.AsNoTracking()
            .Where(q => q.Category == QuestionCategory.Ser).ToListAsync();
        var isharaTask = _db.Questions.AsNoTracking()
            .Where(q => q.Category == QuestionCategory.Ishara).ToListAsync();
        var mechanicTask = _db.Questions.AsNoTracking()
            .Where(q => q.Category == QuestionCategory.Mechanic).ToListAsync();

        await Task.WhenAll(serTask, isharaTask, mechanicTask);

        var ser = await serTask;
        var ishara = await isharaTask;
        var mechanic = await mechanicTask;

        if (ser.Count < 12 || ishara.Count < 12 || mechanic.Count < 6)
            return Conflict(new { message = "بنك الأسئلة لا يحتوي عدداً كافياً من الأسئلة لهذا النموذج." });

        static List<Question> Pick(IEnumerable<Question> source, int count, int seed)
        {
            var copy = source.ToList();
            var state = unchecked((uint)(seed * 2654435761u));
            for (var i = copy.Count - 1; i > 0; i--)
            {
                state = unchecked((state ^ (state >> 16)) * 2246822519u + 3266489917u);
                var j = (int)(state % (uint)(i + 1));
                (copy[i], copy[j]) = (copy[j], copy[i]);
            }
            return copy.Take(count).ToList();
        }

        var picked = new List<Question>(30);
        picked.AddRange(Pick(ser, 12, checked(modelId * 1009 + 11)));
        picked.AddRange(Pick(ishara, 12, checked(modelId * 1009 + 23)));
        picked.AddRange(Pick(mechanic, 6, checked(modelId * 1009 + 37)));

        return Ok(picked);
    }
}
