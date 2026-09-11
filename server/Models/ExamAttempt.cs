namespace DrivingTestApi.Models;

// نتيجة اختبار واحد أنجزه طالب — هاد هو الجدول يلي كانت لوحة التحكم ناقصاه
// (قبلها كانت النتيجة تظهر عالشاشة وبس وتضيع، ما في أي أثر فيها بقاعدة البيانات).
public class ExamAttempt
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int ModelId { get; set; }
    public int Correct { get; set; }
    public int Total { get; set; }
    public int Answered { get; set; }

    // أرقام الأسئلة يلي أخطأ فيها الطالب بهاد المحاولة بالذات
    public List<int> WrongQuestionIds { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
