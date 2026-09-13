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

        return Ok(DeduplicateQuestions(questions));
    }

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
                return Conflict(new { message = $"قسم {CategoryName(category)} لا يحتوي عدداً كافياً من الأسئلة الفريدة والمصورة لهذا النموذج." });

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
        if (question.Category != QuestionCategory.Ishara)
            return true;

        var src = question.ImageUrl;
        if (string.IsNullOrWhiteSpace(src))
            return false;

        var match = Regex.Match(src, @"(?:^|/)sign_(\d+)\.(?:webp|png|jpe?g)$", RegexOptions.IgnoreCase);
        if (!match.Success)
            return false;

        var number = int.Parse(match.Groups[1].Value);
        return (number >= 1 && number <= 131) || (number >= 200 && number <= 205);
    }

    private static List<Question> DeduplicateQuestions(IEnumerable<Question> source)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<Question>();

        foreach (var question in source.OrderBy(q => q.Id))
        {
            // A sign question without its canonical image must never reach the
            // student UI or the timed exam.
            if (!HasCanonicalQuestionImage(question)) continue;

            var visualKey = question.Category == QuestionCategory.Ishara
                ? $"{question.ImageUrl ?? string.Empty}|{question.DiagramUrl ?? string.Empty}|{string.Join("\u001f", question.Options ?? new List<string>())}"
                : string.Empty;

            var key = $"{question.Category}|{NormalizeText(question.Text)}|{visualKey}";
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
