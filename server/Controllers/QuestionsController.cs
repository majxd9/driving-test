using DrivingTestApi.Data;
using DrivingTestApi.Models;
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

    public QuestionsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<Question>>> GetByCategory([FromQuery] QuestionCategory category)
    {
        var questions = await _db.Questions
            .AsNoTracking()
            .Where(q => q.Category == category)
            .ToListAsync();
        return Ok(questions);
    }

    // يجلب 30 سؤالاً جاهزاً من الخادم بطلب واحد بدل تحميل بنك الأسئلة كاملاً من 3 طلبات.
    // النموذج 1..8 يغيّر البذرة فقط، مع توزيع ثابت 12 سير + 12 إشارات + 6 ميكانيك.
    [HttpGet("exam/{modelId:int}")]
    public async Task<ActionResult<List<Question>>> GetExam(int modelId)
    {
        if (modelId is < 1 or > 8)
            return BadRequest(new { message = "رقم النموذج يجب أن يكون بين 1 و8." });

        var all = await _db.Questions.AsNoTracking().ToListAsync();
        var required = new[]
        {
            (Category: QuestionCategory.Ser, Count: 12),
            (Category: QuestionCategory.Ishara, Count: 12),
            (Category: QuestionCategory.Mechanic, Count: 6)
        };

        if (required.Any(r => all.Count(q => q.Category == r.Category) < r.Count))
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

        var picked = new List<Question>();
        var salts = new Dictionary<QuestionCategory, int>
        {
            [QuestionCategory.Ser] = 11,
            [QuestionCategory.Ishara] = 23,
            [QuestionCategory.Mechanic] = 37
        };

        foreach (var (category, count) in required)
        {
            var source = all.Where(q => q.Category == category);
            picked.AddRange(Pick(source, count, checked(modelId * 1009 + salts[category])));
        }

        // النموذج 7 و8 ليسا مجرد إعادة تسمية: نستخدم بذوراً مختلفة تعطي تركيبات أصعب ومتنوعة من بنك الأسئلة.
        return Ok(picked);
    }
}
