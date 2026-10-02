namespace DrivingTestApi.Services;

public static class SystemAudioCatalog
{
    public const string FirstEntry = "question-audio-first-entry";
    public const string Enabled = "question-audio-enabled";
    public const string Disabled = "question-audio-disabled";

    public static bool IsKnownKey(string? key) =>
        key is FirstEntry or Enabled or Disabled;
}
