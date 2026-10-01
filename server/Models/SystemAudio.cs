namespace DrivingTestApi.Models;

public class SystemAudio
{
    public string Key { get; set; } = string.Empty;
    public byte[] AudioBytes { get; set; } = Array.Empty<byte>();
    public string ContentHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
