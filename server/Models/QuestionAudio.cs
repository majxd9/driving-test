namespace DrivingTestApi.Models;

public class QuestionAudio
{
    public int QuestionId { get; set; }
    public byte[] AudioBytes { get; set; } = Array.Empty<byte>();
    public string ContentHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
