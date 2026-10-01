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
            QuestionCategory.Ishara => "a realistic road situation involving the traffic sign or traffic rule",
            QuestionCategory.Mechanic => "a realistic vehicle mechanical inspection or maintenance situation",
            _ => "a realistic road-traffic situation that visually explains the driving rule"
        };

        var questionText = question.Text?.Trim() ?? string.Empty;
        var cue = VisualCue(questionText);
        var options = question.Options
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select((x, i) => $"{i + 1}. {x.Trim()}")
            .ToArray();

        var positive = new StringBuilder()
            .Append("Create ONE coherent, highly specific educational scene for a Syrian driving-theory question. ")
            .Append("Do not make a generic stock image and do not simply illustrate isolated nouns from the question. ")
            .Append("First understand the meaning of the entire question, identify the exact traffic or mechanical situation being tested, ")
            .Append("then invent the most natural visual scene that would let a student immediately recognize that situation. ")
            .Append("The scene itself must communicate the important relationships: road layout, vehicle positions, direction of travel, ")
            .Append("lane or path, relevant road users, weather, lighting, distance, and the specific event or condition described by the question. ")
            .Append("Use realistic Syrian-style road context where appropriate, with believable cars, road markings and surroundings. ")
            .Append("Show the decisive visual context clearly in the composition instead of hiding it in the background. ")
            .Append("Question category: ").Append(categoryText).Append(". ")
            .Append("Question: ").Append(questionText).Append(". ");

        if (options.Length > 0)
        {
            positive
                .Append("Possible answers are supplied only as semantic context so you can understand what the question is testing: ")
                .Append(string.Join(" | ", options))
                .Append(". Do NOT depict, highlight, label, or visually select any answer. ");
        }

        if (!string.IsNullOrWhiteSpace(cue))
            positive.Append("Relevant visual cues suggested by the text: ").Append(cue).Append(". ");

        if (question.Category == QuestionCategory.Ishara)
        {
            positive
                .Append("If the question concerns a traffic sign, place the relevant sign naturally where a driver would encounter it, ")
                .Append("with enough surrounding road context to explain its meaning. Do not invent a different sign or alter the official sign design. ");
        }

        if (question.Category == QuestionCategory.Mechanic)
        {
            positive
                .Append("If the question concerns a mechanical part, show the correct physical component in its real location on the vehicle, ")
                .Append("with a useful camera angle and enough surrounding components to make the part understandable. ");
        }

        positive
            .Append("Use a realistic photographic educational style, natural perspective, physically plausible vehicles and lighting, ")
            .Append("clear subject separation, and a composition suitable for a driving-learning app. ")
            .Append("The image should explain the situation visually without needing written explanation. ")
            .Append("No answer-specific highlighting, no text, no labels, no numbers, no check marks, no arrows, no circles, no UI, no watermark. ");

        const string negative =
            "generic stock photo, random cars driving, unrelated traffic scene, vague road scene, isolated car without context, " +
            "correct answer, wrong answer, highlighted choice, answer selection, checkmark, X mark, arrow, circle around a choice, " +
            "answer text, labels, captions, letters, numbers, UI, quiz interface, invented traffic sign symbol, altered traffic sign, " +
            "watermark, logo, distorted vehicle, deformed wheels, duplicate cars, impossible road geometry, unrealistic perspective";

        return (positive.ToString(), negative);
    }

    private static string VisualCue(string text)
    {
        var mappings = new (string,string)[]
        {
            ("ضباب","foggy weather"),("ليل","night driving"),("نفق","tunnel entrance or tunnel driving"),
            ("تقاطع","road intersection"),("دوار","roundabout"),("تجاوز","overtaking situation"),
            ("انزلاق","vehicle losing traction on the road"),("فرامل","braking action and brake system"),
            ("إضاءة","vehicle lighting system"),("ضوء","vehicle lights"),("مشاة","pedestrian crossing context"),
            ("إطار","tire and wheel"),("بطارية","car battery"),("زيت","engine oil service"),
            ("راديتر","cooling radiator"),("سرعة","speed and road context"),("وقوف","parked or stopped vehicle"),
            ("منحدر","sloped road"),("صعود","uphill road"),("هبوط","downhill road")
        };

        return string.Join(", ", mappings
            .Where(x => text.Contains(x.Item1, StringComparison.OrdinalIgnoreCase))
            .Select(x => x.Item2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6));
    }

    private static bool ContainsVisualTerm(string? text) =>
        !string.IsNullOrWhiteSpace(text) &&
        VisualTerms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    private static bool ContainsAny(string text, params string[] terms) =>
        terms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    public static string GetContentHash(Question question)
    {
        var payload = string.Join("\u001f", "ai-image-v2", question.Category, question.Text.Trim(),
            string.Join("\u001e", question.Options.Select(x => x.Trim())), question.ImageUrl?.Trim() ?? string.Empty,
            question.DiagramType ?? string.Empty, question.DiagramUrl?.Trim() ?? string.Empty,
            question.DiagramTitle?.Trim() ?? string.Empty, question.DiagramDescription?.Trim() ?? string.Empty);

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}
