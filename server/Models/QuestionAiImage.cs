namespace DrivingTestApi.Models;

public sealed class QuestionAiImage
{
    public int QuestionId { get; set; }
    public byte[] ImageBytes { get; set; } = Array.Empty<byte>();
    public string ContentHash { get; set; } = string.Empty;
    public string ContentType { get; set; } = "image/png";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}