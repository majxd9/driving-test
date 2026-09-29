using System.Text.RegularExpressions;
using DrivingTestApi.Data;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public static class ExamQuestionPicker
{
    public static async Task<List<Question>> GetAsync(AppDbContext db, int modelId)
    {
        if (modelId is < 1 or > 8)
            throw new ArgumentOutOfRangeException(nameof(modelId));

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
            var source = await QuestionBankCache.GetCategoryAsync(db, category);
            var unique = DeduplicateQuestions(source);
            if (unique.Count < count)
                throw new InvalidOperationException($"قسم {CategoryName(category)} لا يحتوي عدداً كافياً من الأسئلة الفريدة الصالحة لهذا النموذج.");

            var categoryPicked = Pick(unique, count, checked(modelId * 1009 + salts[category]));

            if (category == QuestionCategory.Ishara)
            {
                var priority = unique
                    .Where(q => Regex.IsMatch(q.ImageUrl ?? string.Empty, @"/signs/sign_(23[6-9]|24[0-5])\.svg$", RegexOptions.IgnoreCase))
                    .OrderBy(q => q.Id)
                    .ToList();

                if (priority.Count > 0 && !categoryPicked.Any(q => priority.Any(p => p.Id == q.Id)))
                {
                    var guaranteed = priority[(modelId - 1) % priority.Count];
                    categoryPicked[^1] = guaranteed;
                }
            }

            if (category == QuestionCategory.Ser)
            {
                var tunnel = unique
                    .Where(q => q.Text.Contains("نفق", StringComparison.Ordinal))
                    .OrderBy(q => q.Id)
                    .FirstOrDefault();

                if (tunnel is not null && !categoryPicked.Any(q => q.Id == tunnel.Id))
                    categoryPicked[^1] = tunnel;
            }

            picked.AddRange(categoryPicked);
        }

        return picked;
    }

    private static string CategoryName(QuestionCategory category) => category switch
    {
        QuestionCategory.Ser => "قواعد السير",
        QuestionCategory.Ishara => "الإشارات المرورية",
        QuestionCategory.Mechanic => "الميكانيك",
        _ => category.ToString()
    };

    private static string NormalizeText(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : string.Join(" ", value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string NormalizeQuestionImage(string? src)
    {
        if (string.IsNullOrWhiteSpace(src)) return src ?? string.Empty;

        var match = Regex.Match(src, @"^/signs/sign_(23[6-9]|24[0-5])\.(?:webp|png|jpe?g)$", RegexOptions.IgnoreCase);
        return match.Success && int.TryParse(match.Groups[1].Value, out var number)
            ? $"/signs/sign_{number}.svg"
            : src;
    }

    private static bool HasCanonicalQuestionImage(Question question)
    {
        var src = NormalizeQuestionImage(question.ImageUrl);
        question.ImageUrl = string.IsNullOrWhiteSpace(src) ? null : src;

        if (question.Category == QuestionCategory.Ishara && string.IsNullOrWhiteSpace(src)) return false;
        if (string.IsNullOrWhiteSpace(src)) return question.Category != QuestionCategory.Ishara;

        var signMatch = Regex.Match(src, @"(?:^|/)sign_(\d+)\.(?:webp|png|jpe?g|svg)$", RegexOptions.IgnoreCase);
        if (signMatch.Success)
        {
            var number = int.Parse(signMatch.Groups[1].Value);
            var trafficSign = (number >= 1 && number <= 131) || (number >= 200 && number <= 205) || (number >= 236 && number <= 245);
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
            if (!HasCanonicalQuestionImage(question)) continue;
            RepairKnownQuestion(question);

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
