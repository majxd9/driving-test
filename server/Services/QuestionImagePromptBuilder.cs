using System.Security.Cryptography;
using System.Text;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public static class QuestionImagePromptBuilder
{
    private static readonly string[] VisualTerms =
    {
        "تقاطع","دوار","دوّار","تجاوز","انزلاق","فرامل","مكبح","ضباب","ليل","نهار","إضاءة","ضوء",
        "مصابيح","مشاة","نفق","وقوف","ركن","منعطف","منحدر","صعود","هبوط","حارة","حادث",
        "إطار","عجلة","محرك","بطارية","زيت","راديتر","تبريد","مقود","مرايا","إشارة","علامة",
        "مسافة أمان","مسافة التوقف","أفضلية","أولوية","طريق زلق","طريق رطب","مفترق","ممر مشاة",
        "إشارة ضوئية","إشارة مرور","ضوء خلفي","ضوء أمامي","ضوء ضباب","غماز","رباعي"
    };

    public static bool ShouldGenerate(Question question)
    {
        // Original educational/sign/mechanics images are authoritative and must
        // never be replaced or supplemented by AI generation.
        if (!string.IsNullOrWhiteSpace(question.ImageUrl) ||
            question.DiagramType is not null ||
            !string.IsNullOrWhiteSpace(question.DiagramUrl))
        {
            return false;
        }

        // AI images are only for questions that have no original visual asset
        // and whose wording describes a concrete visual traffic situation.
        return question.Category == QuestionCategory.Ser &&
               ContainsVisualTerm(question.Text);
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
            QuestionCategory.Ishara => "a real-world traffic-sign scene",
            QuestionCategory.Mechanic => "a close, physically accurate vehicle-mechanics scene",
            _ => "a specific road-traffic situation"
        };

        var questionText = question.Text?.Trim() ?? string.Empty;
        var cue = VisualCue(questionText);

        // Keep the image model focused on the tested situation rather than dumping
        // every answer choice into the prompt. This reduces generic "car on a road"
        // generations and avoids accidentally drawing the correct option as a cue.
        var positive = new StringBuilder()
            .Append("Create ONE highly specific educational image for a Syrian driving-theory question. ")
            .Append("The image must depict the exact physical situation described by the question, not a generic car, generic road, stock traffic photo, or decorative scene. ")
            .Append("Use the question meaning as the primary source of truth. ")
            .Append("Show the essential geometry and relationships that make this situation recognizable: road layout, lanes, vehicle positions, direction of travel, ")
            .Append("relevant road users, weather, visibility, lighting, and distances. ")
            .Append("Do not invent an unrelated event just because the question contains a general word such as car, road, driver, or traffic. ")
            .Append("If the question is asking what a driver should do, depict the situation BEFORE the action rather than illustrating an answer action. ")
            .Append("If the question asks about a component, depict the component itself and its real position on the vehicle. ")
            .Append("Question category: ").Append(categoryText).Append(". ")
            .Append("Question: ").Append(questionText).Append(". ");

        if (!string.IsNullOrWhiteSpace(cue))
            positive.Append("Visual scene anchors: ").Append(cue).Append(". ");

        if (question.Category == QuestionCategory.Ishara)
        {
            positive
                .Append("For a traffic-sign question, show the exact relevant official sign in a believable roadside position, ")
                .Append("with enough road context to make the sign's role clear. Never replace it with a random sign. ");
        }

        if (question.Category == QuestionCategory.Mechanic)
        {
            positive
                .Append("For a mechanics question, use a useful close-up or cutaway-style composition that clearly shows the requested component, ")
                .Append("its neighboring parts, and its real location. Do not use a generic exterior car photo. ");
        }

        positive
            .Append("Realistic photographic educational style, natural perspective, plausible vehicles and road geometry, strong subject clarity. ")
            .Append("ABSOLUTELY NO WRITTEN LANGUAGE inside the image: no Arabic, no English, no words, no captions, no labels, no letters, no numbers. ")
            .Append("No UI, watermark, logo, arrows, circles, check marks, X marks, answer highlighting, or decorative text. ");

        const string negative =
            "generic car, generic road, stock traffic photo, random driving scene, unrelated cars, isolated car, decorative vehicle render, " +
            "incorrect road layout, wrong traffic sign, invented sign, altered sign symbol, answer action, correct answer cue, highlighted choice, " +
            "text, Arabic writing, English writing, words, captions, labels, letters, numbers, road text, logo, watermark, UI, quiz interface, " +
            "arrow, circle, checkmark, X mark, distorted vehicle, deformed wheels, duplicate cars, impossible geometry, unrealistic perspective";

        return (positive.ToString(), negative);
    }

    private static string VisualCue(string text)
    {
        var mappings = new (string,string)[]
        {
            ("ضباب","foggy weather with low visibility"),
            ("ليل","night driving with visible vehicle lights"),
            ("نفق","tunnel entrance or tunnel driving"),
            ("تقاطع","road intersection with visible lanes"),
            ("مفترق","road junction with visible lanes"),
            ("دوار","roundabout with clear circulating lanes"),
            ("تجاوز","overtaking on a clearly marked road"),
            ("انزلاق","loss of tire traction on the road"),
            ("طريق زلق","wet/slippery road surface"),
            ("فرامل","braking situation"),
            ("مسافة التوقف","stopping-distance context with safe spacing"),
            ("مسافة أمان","safe following distance"),
            ("إضاءة","vehicle lighting conditions"),
            ("ضوء ضباب","front/rear fog light situation"),
            ("غماز","turn signal situation at a junction"),
            ("رباعي","hazard warning lights"),
            ("مشاة","pedestrian crossing context"),
            ("إطار","tire and wheel close-up"),
            ("بطارية","car battery compartment"),
            ("زيت","engine oil inspection/service"),
            ("راديتر","cooling radiator and coolant system"),
            ("محرك","engine compartment"),
            ("منعطف","road bend with visible curvature"),
            ("منحدر","sloped road"),
            ("صعود","uphill road"),
            ("هبوط","downhill road"),
            ("ركن","parking manoeuvre context"),
            ("وقوف","stopped/parked vehicle context"),
            ("مرايا","vehicle mirror and surrounding visibility")
        };

        return string.Join(", ", mappings
            .Where(x => text.Contains(x.Item1, StringComparison.OrdinalIgnoreCase))
            .Select(x => x.Item2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(7));
    }

    private static bool ContainsVisualTerm(string? text) =>
        !string.IsNullOrWhiteSpace(text) &&
        VisualTerms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    private static bool ContainsAny(string text, params string[] terms) =>
        terms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    public static string GetContentHash(Question question)
    {
        var payload = string.Join("\u001f", "ai-image-v3-specific-situation-text-free", question.Category, question.Text.Trim(),
            string.Join("\u001e", question.Options.Select(x => x.Trim())), question.ImageUrl?.Trim() ?? string.Empty,
            question.DiagramType ?? string.Empty, question.DiagramUrl?.Trim() ?? string.Empty,
            question.DiagramTitle?.Trim() ?? string.Empty, question.DiagramDescription?.Trim() ?? string.Empty);

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}
