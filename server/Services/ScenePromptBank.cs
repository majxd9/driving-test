using System.Text.RegularExpressions;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed record ScenePromptEntry(
    int Index,
    QuestionCategory Category,
    string Question,
    string Positive,
    string Negative,
    IReadOnlyList<string> References);

public static class ScenePromptBank
{
    private static readonly Lazy<IReadOnlyList<ScenePromptEntry>> Entries = new(Load, true);

    public static int Count => Entries.Value.Count;

    public static bool TryGet(Question question, out (string Positive, string Negative) prompt)
    {
        var category = question.Category;
        var normalizedQuestion = Normalize(question.Text);
        var questionReferences = ExtractReferences(question.ImageUrl, question.DiagramUrl);

        // The prompt bank is keyed by the question number as well as the text.
        // Many driving questions intentionally share identical wording
        // (for example multiple "ما معنى هذه الإشارة؟" entries). Never choose
        // the first text match because that silently routes a question to
        // another question's scene.
        var idMatch = Entries.Value.FirstOrDefault(x =>
            x.Index == question.Id &&
            x.Category == category &&
            Normalize(x.Question) == normalizedQuestion);

        if (idMatch is not null)
        {
            prompt = (idMatch.Positive.Trim(), idMatch.Negative.Trim());
            return true;
        }

        var candidates = Entries.Value
            .Where(x => x.Category == category && Normalize(x.Question) == normalizedQuestion)
            .ToList();

        if (candidates.Count > 1 && questionReferences.Count > 0)
        {
            var referenceMatches = candidates
                .Where(x => x.References.Any(r =>
                    questionReferences.Any(qr => PathsEqual(r, qr))))
                .ToList();

            if (referenceMatches.Count == 1)
            {
                var selected = referenceMatches[0];
                prompt = (selected.Positive.Trim(), selected.Negative.Trim());
                return true;
            }

            // More than one matching reference is still ambiguous; do not
            // silently select the first scene.
            if (referenceMatches.Count > 1)
            {
                prompt = default;
                return false;
            }
        }

        // A text-only match is safe only when it is unique.
        if (candidates.Count == 1)
        {
            var selected = candidates[0];
            prompt = (selected.Positive.Trim(), selected.Negative.Trim());
            return true;
        }

        prompt = default;
        return false;
    }

    private static IReadOnlyList<ScenePromptEntry> Load()
    {
        var path = Path.Combine(
            AppContext.BaseDirectory,
            "Prompts",
            "rukhsati_397_ai_scene_prompts.txt");

        if (!File.Exists(path))
            return Array.Empty<ScenePromptEntry>();

        var text = File.ReadAllText(path);
        var headers = Regex.Matches(
            text,
            @"(?m)^\[(\d{3})\]\s+(.+?)\s*$",
            RegexOptions.CultureInvariant);

        var entries = new List<ScenePromptEntry>(headers.Count);

        for (var i = 0; i < headers.Count; i++)
        {
            var match = headers[i];
            var end = i + 1 < headers.Count ? headers[i + 1].Index : text.Length;
            var block = text[match.Index..end];

            var index = int.Parse(match.Groups[1].Value);
            var category = ParseCategory(match.Groups[2].Value);

            var questionMatch = Regex.Match(
                block,
                @"(?m)^السؤال:\s*(.+?)\s*$",
                RegexOptions.CultureInvariant);

            var positiveStart = block.IndexOf(
                "PROMPT:",
                StringComparison.Ordinal);

            var negativeStart = block.IndexOf(
                "NEGATIVE PROMPT:",
                StringComparison.Ordinal);

            if (questionMatch.Success &&
                positiveStart >= 0 &&
                negativeStart > positiveStart)
            {
                var positive = block[
                    (positiveStart + "PROMPT:".Length)..negativeStart].Trim();

                var negative = block[
                    (negativeStart + "NEGATIVE PROMPT:".Length)..].Trim();

                entries.Add(new ScenePromptEntry(
                    index,
                    category,
                    questionMatch.Groups[1].Value.Trim(),
                    positive,
                    negative,
                    ExtractReferencesFromBlock(block)));
            }
        }

        return entries;
    }

    private static QuestionCategory ParseCategory(string value) =>
        value.Trim() switch
        {
            "الإشارات المرورية" => QuestionCategory.Ishara,
            "الميكانيك" => QuestionCategory.Mechanic,
            _ => QuestionCategory.Ser
        };

    private static List<string> ExtractReferencesFromBlock(string block)
    {
        var refs = Regex.Matches(
            block,
            @"/(?:signs|mechanic)/[A-Za-z0-9._/-]+",
            RegexOptions.CultureInvariant);

        return refs
            .Select(x => x.Value.TrimEnd('.', ',', ';', ')'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> ExtractReferences(params string?[] values) =>
        values
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .SelectMany(x =>
            {
                var matches = Regex.Matches(
                    x!,
                    @"/(?:signs|mechanic)/[A-Za-z0-9._/-]+",
                    RegexOptions.CultureInvariant);

                return matches.Count > 0
                    ? matches.Select(m => m.Value)
                    : new[] { x!.Trim() };
            })
            .Select(x => x.TrimEnd('.', ',', ';', ')'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static bool PathsEqual(string left, string right) =>
        NormalizePath(left).Equals(
            NormalizePath(right),
            StringComparison.OrdinalIgnoreCase);

    private static string NormalizePath(string value) =>
        value
            .Trim()
            .TrimEnd('.', ',', ';', ')')
            .Replace("\\", "/")
            .TrimStart('/');

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var chars = value
            .Trim()
            .Normalize()
            .Where(c => !char.IsPunctuation(c))
            .ToArray();

        return Regex.Replace(
            new string(chars),
            @"\s+",
            " ");
    }
}
