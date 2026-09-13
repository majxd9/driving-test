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
        => Ok(await _db.Questions.AsNoTracking().Where(q => q.Category == category).ToListAsync());

    [HttpGet("count")]
    public async Task<ActionResult<int>> GetCount()
    {
        await QuestionCountCache.InitializeAsync(_db);
        return Ok(QuestionCountCache.Total);
    }

    [HttpGet("exam/{modelId:int}")]
    public async Task<ActionResult<List<Question>>> GetExam(int modelId)
    {
        if (modelId is < 1 or > 8) return BadRequest(new { message = "رقم النموذج يجب أن يكون بين 1 و8." });

        var required = new[]
        {
            (Category: QuestionCategory.Ser, Count: 12),
            (Category: QuestionCategory.Ishara, Count: 12),
            (Category: QuestionCategory.Mechanic, Count: 6)
        };

        // لا نحمل بنك الأسئلة كاملاً إلى الذاكرة: نتحقق من العدد لكل تصنيف ثم نسحب فقط المطلوب.
        foreach (var (category, count) in required)
        {
            if (await _db.Questions.AsNoTracking().CountAsync(q => q.Category == category) < count)
                return Conflict(new { message = "بنك الأسئلة لا يحتوي عدداً كافياً من الأسئلة لهذا النموذج." });
        }

        static List<Question> Pick(List<Question> source, int count, int seed)
        {
            var state = unchecked((uint)(seed * 2654435761u));
            for (var i = source.Count - 1; i > 0; i--)
            {
                state = unchecked((state ^ (state >> 16)) * 2246822519u + 3266489917u);
                var j = (int)(state % (uint)(i + 1));
                (source[i], source[j]) = (source[j], source[i]);
            }
            return source.Take(count).ToList();
        }

        var picked = new List<Question>(30);
        var salts = new Dictionary<QuestionCategory, int>
        {
            [QuestionCategory.Ser] = 11,
            [QuestionCategory.Ishara] = 23,
            [QuestionCategory.Mechanic] = 37
        };

        foreach (var (category, count) in required)
        {
            // نستخدم ORDER BY random فقط على مجموعة التصنيف داخل قاعدة البيانات، ثم نعيد 12/6 سجلات.
            // هذا يمنع تحميل بنك الأسئلة الكامل في API.
            var source = await _db.Questions.AsNoTracking()
                .Where(q => q.Category == category)
                .OrderBy(q => EF.Functions.Random())
                .Take(Math.Max(count * 3, count))
                .ToListAsync();
            picked.AddRange(Pick(source, count, checked(modelId * 1009 + salts[category])));
        }

        return Ok(picked);
    }
}
