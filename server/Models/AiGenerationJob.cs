namespace DrivingTestApi.Models;

public enum AiGenerationJobType { Audio = 0, AiImage = 1 }
public enum AiGenerationJobStatus { Pending = 0, Processing = 1, Completed = 2, Failed = 3 }

public sealed class AiGenerationJob
{
    public long Id { get; set; }
    public int QuestionId { get; set; }
    public AiGenerationJobType JobType { get; set; }
    public AiGenerationJobStatus Status { get; set; } = AiGenerationJobStatus.Pending;
    public int Attempts { get; set; }
    public string ContentHash { get; set; } = string.Empty;
    public int Priority { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public DateTime? LockedUntil { get; set; }
    public string? LastError { get; set; }
}