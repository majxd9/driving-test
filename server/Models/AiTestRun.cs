namespace DrivingTestApi.Models;

public enum AiTestRunType
{
    Audio = 0,
    Image = 1
}

public enum AiTestRunStatus
{
    Pending = 0,
    Processing = 1,
    Succeeded = 2,
    Failed = 3,
    Approved = 4,
    Rejected = 5
}

public sealed class AiTestRun
{
    public long Id { get; set; }
    public int QuestionId { get; set; }
    public AiTestRunType Type { get; set; }
    public string Provider { get; set; } = string.Empty;
    public AiTestRunStatus Status { get; set; } = AiTestRunStatus.Pending;
    public string ContentHash { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string NegativePrompt { get; set; } = string.Empty;
    public byte[] MediaBytes { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = "application/octet-stream";
    public string? ErrorType { get; set; }
    public string? ErrorMessage { get; set; }
    public int Attempts { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
