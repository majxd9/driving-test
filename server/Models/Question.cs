namespace DrivingTestApi.Models;

public enum QuestionCategory
{
    Ser,     // قواعد السير
    Ishara,  // الإشارات
    Mechanic // الميكانيك
}

public class Question
{
    public int Id { get; set; }
    public QuestionCategory Category { get; set; }
    public string Text { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectAnswerIndex { get; set; }

    // جديد: سبب كون هاد الجواب هو الصحيح
    public string? Explanation { get; set; }

    // جديد: صورة/رسم توضيحي اختياري (مفيد خصوصاً لأسئلة الإشارات)
    public string? ImageUrl { get; set; }
}
