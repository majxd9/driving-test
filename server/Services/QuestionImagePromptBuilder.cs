using System.Security.Cryptography;
using System.Text;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public static class QuestionImagePromptBuilder
{
    private static readonly string[] VisualTerms =
    {
        "تقاطع","دوار","دوّار","تجاوز","انزلاق","فرامل","مكبح","ضباب","ليل","نهار","إضاءة","ضوء",
        "مصابيح","طريق","مسار","مركبة","سيارة","مشاة","نفق","سرعة","وقوف","ركن","منعطف","منحدر",
        "صعود","هبوط","حارة","خطر","حادث","إطار","عجلة","محرك","بطارية","زيت","راديتر","تبريد",
        "مقود","مرايا","إشارة","علامة"
    };

    public static bool ShouldGenerate(Question question)
    {
        if (question.Category == QuestionCategory.Ishara) return true;
        if (question.Category == QuestionCategory.Mechanic)
            return !string.IsNullOrWhiteSpace(question.ImageUrl) || ContainsVisualTerm(question.Text);
        return ContainsVisualTerm(question.Text) || question.DiagramType is not null || !string.IsNullOrWhiteSpace(question.DiagramUrl);
    }

    public static int GetPriority(Question question)
    {
        var text = question.Text ?? string.Empty;
        if (question.Category == QuestionCategory.Mechanic ||
            ContainsAny(text,"إضاءة","ضوء","فرامل","انزلاق","خطر","حادث","نفق","تجاوز")) return 100;
        if (question.Category == QuestionCategory.Ishara ||
            question.DiagramType is not null ||
            !string.IsNullOrWhiteSpace(question.DiagramUrl)) return 60;
        return 20;
    }

    public static (string Positive,string Negative) Build(Question question)
    {
        var categoryText = question.Category switch
        {
            QuestionCategory.Ishara => "traffic sign context on a real road",
            QuestionCategory.Mechanic => "vehicle mechanical component or maintenance context",
            _ => "realistic road traffic situation"
        };
        var cue = VisualCue(question.Text);
        var positive = new StringBuilder()
            .Append("Realistic educational driving-safety illustration for a Syrian driving theory learning app. ")
            .Append("Show a clear, neutral visual scene for ").Append(categoryText).Append(". ")
            .Append("The visual scenario should help understand the rule without choosing an answer. ")
            .Append("Scene description: ").Append(question.Text.Trim()).Append(". ");
        if (!string.IsNullOrWhiteSpace(cue)) positive.Append("Useful visual context: ").Append(cue).Append(". ");
        if (question.Category == QuestionCategory.Ishara)
            positive.Append("Use road context around a traffic sign, but do not redraw or invent the official sign symbol; the original official sign is displayed separately. ");
        if (question.Category == QuestionCategory.Mechanic)
            positive.Append("Show the relevant vehicle part in a natural educational view without labels or callouts. ");
        positive.Append("No answer-specific highlighting, no text, no labels, no numbers, no check marks, no arrows, no circles, no UI, no watermark. ");
        const string negative = "correct answer, wrong answer, highlighted choice, checkmark, X mark, arrow, circle around a choice, answer text, labels, captions, letters, numbers, UI, quiz interface, invented traffic sign symbol, watermark, logo, distorted vehicle";
        return (positive.ToString(),negative);
    }

    private static string VisualCue(string text)
    {
        var mappings = new (string,string)[]
        {
            ("ضباب","foggy weather"),("ليل","night driving"),("نفق","tunnel entrance or tunnel driving"),
            ("تقاطع","road intersection"),("دوار","roundabout"),("تجاوز","safe overtaking context"),
            ("انزلاق","vehicle skid situation"),("فرامل","braking system"),("إضاءة","vehicle lighting"),
            ("ضوء","vehicle lights"),("مشاة","pedestrian crossing context"),("إطار","tire and wheel"),
            ("بطارية","car battery"),("زيت","engine oil service"),("راديتر","cooling radiator"),
            ("سرعة","speed and road context"),("وقوف","parked or stopped vehicle"),("منحدر","sloped road"),
            ("صعود","uphill road"),("هبوط","downhill road")
        };
        return string.Join(", ",mappings.Where(x=>text.Contains(x.Item1,StringComparison.OrdinalIgnoreCase))
            .Select(x=>x.Item2).Distinct(StringComparer.OrdinalIgnoreCase).Take(4));
    }

    private static bool ContainsVisualTerm(string? text) =>
        !string.IsNullOrWhiteSpace(text) && VisualTerms.Any(t=>text.Contains(t,StringComparison.OrdinalIgnoreCase));

    private static bool ContainsAny(string text,params string[] terms) =>
        terms.Any(t=>text.Contains(t,StringComparison.OrdinalIgnoreCase));

    public static string GetContentHash(Question question)
    {
        var payload=string.Join("","ai-image-v1",question.Category,question.Text.Trim(),
            string.Join("",question.Options.Select(x=>x.Trim())),question.ImageUrl?.Trim()??string.Empty,
            question.DiagramType??string.Empty,question.DiagramUrl?.Trim()??string.Empty,
            question.DiagramTitle?.Trim()??string.Empty,question.DiagramDescription?.Trim()??string.Empty);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}