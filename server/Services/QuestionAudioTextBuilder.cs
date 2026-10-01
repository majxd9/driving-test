using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public static class QuestionAudioTextBuilder
{
    public static string Build(Question question)
    {
        var builder = new StringBuilder();
        builder.Append("السُّؤَالُ: ").Append(PrepareTtsText(question.Text));
        for (var i = 0; i < question.Options.Count; i++)
        {
            builder.Append(". الخِيَارُ رَقْمُ ").Append(ArabicNumber(i + 1))
                .Append(": ").Append(PrepareTtsText(question.Options[i]));
        }
        return builder.ToString();
    }

    public static string GetCurrentHash(Question question) =>
        Hash($"{question.Category}|{Build(question)}");

    public static string GetLegacyHash(Question question) => Hash(Build(question));

    // Hash used by the pre-queue Admin audio generator.
    public static string GetPreviousAdminHash(Question question)
    {
        var builder = new StringBuilder();
        builder.Append("السؤال: ").Append(question.Text.Trim());

        var letters = new[] { "أ", "ب", "ج", "د", "هـ", "و" };
        for (var i = 0; i < question.Options.Count; i++)
        {
            builder.Append(". الإجابة ")
                .Append(i < letters.Length ? letters[i] : (i + 1).ToString())
                .Append(": ")
                .Append(question.Options[i].Trim());
        }

        return Hash(builder.ToString());
    }

    private static string PrepareTtsText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var text = Regex.Replace(value.Normalize(NormalizationForm.FormC), @"s+", " ").Trim();
        var marks = new (string Word, string Marked)[]
        {
            ("السؤال","السُّؤَال"),("الإجابة","الإِجَابَة"),("الخيار","الخِيَار"),("رقم","رَقْم"),
            ("على","عَلَى"),("إلى","إِلَى"),("في","فِي"),("من","مِنْ"),("ما","مَا"),("هل","هَلْ"),
            ("عند","عِنْدَ"),("عليك","عَلَيْكَ"),("هذه","هَذِهِ"),("التي","الَّتِي"),("الذي","الَّذِي")
        };
        foreach (var (word, marked) in marks)
            text = Regex.Replace(text,$@"(?<![؀-ۿ]){Regex.Escape(word)}(?![؀-ۿ])",marked);
        return text;
    }

    private static string ArabicNumber(int number) =>
        number.ToString(CultureInfo.InvariantCulture)
            .Replace('0','٠').Replace('1','١').Replace('2','٢').Replace('3','٣').Replace('4','٤')
            .Replace('5','٥').Replace('6','٦').Replace('7','٧').Replace('8','٨').Replace('9','٩');

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}