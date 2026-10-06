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
    public List<int> QuestionIds { get; set; } = new();
    public string AnswersJson { get; set; } = "{}";
    public bool Completed { get; set; } = false;
    public DateTime ExpiresAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
