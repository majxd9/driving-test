namespace DrivingTestApi.Services;

public static class SystemAudioCatalog
{
    public const string FirstEntry = "question-audio-first-entry";
    public const string Enabled = "question-audio-enabled";
    public const string Disabled = "question-audio-disabled";

    public const string CarGuideWelcome = "car-guide-welcome";
    public const string CarGuideRotate = "car-guide-rotate";
    public const string CarGuideZoom = "car-guide-zoom";
    public const string CarGuideParts = "car-guide-parts";
    public const string CarGuideQuality = "car-guide-quality";


    public static bool IsKnownKey(string? key) =>
        key is FirstEntry or Enabled or Disabled
            or CarGuideWelcome or CarGuideRotate or CarGuideZoom or CarGuideParts or CarGuideQuality;
}
