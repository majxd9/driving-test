namespace DrivingTestApi.Models;

// نموذج امتحان جاهز (مثل النماذج الستة بالنظام القديم): مجموعة أسئلة محددة مسبقاً
public class ExamModel
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // مثال: "النموذج 1"
    public List<int> QuestionIds { get; set; } = new();
    public int DurationSeconds { get; set; } = 900; // 15 دقيقة افتراضياً
    public int PassingScore { get; set; } = 25;
}
