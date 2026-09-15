using DrivingTestApi.Data;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

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
            .OrderBy(q => q.Id)
            .ToListAsync();

        Response.Headers.CacheControl = "private,max-age=60,stale-while-revalidate=30";
        return Ok(DeduplicateQuestions(questions));
    }

    [HttpGet("count")]
    public async Task<ActionResult<int>> GetCount()
    {
        await QuestionCountCache.InitializeAsync(_db);
        Response.Headers.CacheControl = "private,max-age=300,stale-while-revalidate=60";
        return Ok(QuestionCountCache.Total);
    }

    [HttpGet("exam/{modelId:int}")]
    public async Task<ActionResult<List<Question>>> GetExam(int modelId)
    {
        if (modelId is < 1 or > 8) return BadRequest(new { message = "رقم النموذج يجب أن يكون بين 1 و8." });
        Response.Headers.CacheControl = "no-store";

        var required = new[]
        {
            (Category: QuestionCategory.Ser, Count: 12),
            (Category: QuestionCategory.Ishara, Count: 12),
            (Category: QuestionCategory.Mechanic, Count: 6)
        };

        var picked = new List<Question>(30);
        var salts = new Dictionary<QuestionCategory, int>
        {
            [QuestionCategory.Ser] = 11,
            [QuestionCategory.Ishara] = 23,
            [QuestionCategory.Mechanic] = 37
        };

        foreach (var (category, count) in required)
        {
            var source = await _db.Questions
                .AsNoTracking()
                .Where(q => q.Category == category)
                .OrderBy(q => q.Id)
                .ToListAsync();

            var unique = DeduplicateQuestions(source);
            if (unique.Count < count)
                return Conflict(new { message = $"قسم {CategoryName(category)} لا يحتوي عدداً كافياً من الأسئلة الفريدة الصالحة لهذا النموذج." });

            picked.AddRange(Pick(unique, count, checked(modelId * 1009 + salts[category])));
        }

        return Ok(picked);
    }

    private static string CategoryName(QuestionCategory category) => category switch
    {
        QuestionCategory.Ser => "قواعد السير",
        QuestionCategory.Ishara => "الإشارات المرورية",
        QuestionCategory.Mechanic => "الميكانيك",
        _ => category.ToString()
    };

    private static string NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return string.Join(" ", value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));
    }

    private static bool HasCanonicalQuestionImage(Question question)
    {
        var src = question.ImageUrl;
        if (question.Category == QuestionCategory.Ishara && string.IsNullOrWhiteSpace(src)) return false;
        if (string.IsNullOrWhiteSpace(src)) return question.Category != QuestionCategory.Ishara;

        var signMatch = Regex.Match(src, @"(?:^|/)sign_(\d+)\.(?:webp|png|jpe?g)$", RegexOptions.IgnoreCase);
        if (signMatch.Success)
        {
            var number = int.Parse(signMatch.Groups[1].Value);
            var trafficSign = (number >= 1 && number <= 131) || (number >= 200 && number <= 205);
            var mechanicInSigns = number >= 210 && number <= 214;
            return trafficSign || mechanicInSigns;
        }

        var mechanicMatch = Regex.Match(src, @"(?:^|/)mechanic/mechanic_(\d+)\.(?:webp|png|jpe?g)$", RegexOptions.IgnoreCase);
        if (mechanicMatch.Success)
        {
            var number = int.Parse(mechanicMatch.Groups[1].Value);
            return number >= 215 && number <= 235;
        }

        return false;
    }

    private static void RepairKnownQuestion(Question question)
    {
        // Keep the intended correct answer while removing the duplicated option
        // that existed in the original seed data. AsNoTracking queries are used,
        // so this response-level repair cannot accidentally persist bad data.
        const string skidQuestion = "في حال انزلقت مركبتك عليك كسائق أن تكون ردة فعلك الأولى:";
        if (question.Category == QuestionCategory.Ser &&
            question.Text == skidQuestion &&
            question.Options.Count == 4 &&
            question.Options.Distinct(StringComparer.Ordinal).Count() < 4)
        {
            question.Options = new List<string>
            {
                "تضغط على الفرامل وتوجه المركبة بعكس اتجاه انزلاق مؤخرتها",
                "لا تضغط على الفرامل وتوجه المركبة إلى الجهة التي تنزل بها مؤخرتها",
                "تضغط على الفرامل وتوجه المركبة إلى الجهة التي تنزل بها مؤخرتها",
                "تترك المقود دون توجيه حتى تتوقف المركبة"
            };
            question.CorrectAnswerIndex = 1;
        }
    }

    private static List<Question> DeduplicateQuestions(IEnumerable<Question> source)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<Question>();
        foreach (var question in source.OrderBy(q => q.Id))
        {
            // Never expose the ten legacy sign_236..245 assets that are not shipped.
            if (!HasCanonicalQuestionImage(question)) continue;

            RepairKnownQuestion(question);

            // Sign questions can legitimately share generic wording/options while
            // referring to different signs. Include the visual identity in the key.
            var key = $"{question.Category}|{NormalizeText(question.Text)}|{string.Join("\u001f", question.Options ?? new List<string>())}|{NormalizeText(question.ImageUrl)}|{NormalizeText(question.DiagramUrl)}";
            if (seen.Add(key)) result.Add(question);
        }
        return result;
    }

    private static List<Question> Pick(List<Question> source, int count, int seed)
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
}
