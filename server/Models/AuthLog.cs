namespace DrivingTestApi.Models;

public class AuthLog
{
    public int Id { get; set; }
    public string? UserId { get; set; }
    public string AttemptedUserName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool Success { get; set; }

    // مثال: Success / WrongPassword / DeviceMismatch / AccountDisabled / AccessExpired / UserNotFound
    public string Reason { get; set; } = string.Empty;
}
