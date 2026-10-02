namespace DrivingTestApi.Models;

public enum AiImageReviewStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public sealed class AiImageReview
{
    public int QuestionId { get; set; }
    public string ContentHash { get; set; } = string.Empty;
    public AiImageReviewStatus Status { get; set; } = AiImageReviewStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}