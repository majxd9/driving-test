namespace DrivingTestApi.Models;

public class ExamAttempt
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int ModelId { get; set; }
    public int Correct { get; set; }
    public int Total { get; set; }
    public int Answered { get; set; }
    public List<int> WrongQuestionIds { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
