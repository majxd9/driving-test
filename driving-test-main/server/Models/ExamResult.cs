namespace DrivingTestApi.Models;

public class ExamResult
{
    public int Id { get; set; }
    public string? UserId { get; set; }
    public int ModelId { get; set; }
    public int Total { get; set; }
    public int Correct { get; set; }
    public int Answered { get; set; }
    public bool Passed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
