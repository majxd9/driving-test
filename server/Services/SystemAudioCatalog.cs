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

    public const string SiteGuideWelcome = "site-guide-welcome";
    public const string SiteGuideTraining = "site-guide-training";
    public const string SiteGuideSigns = "site-guide-signs";
    public const string SiteGuideExam = "site-guide-exam";
    public const string SiteGuidePractical = "site-guide-practical";
    public const string SiteGuideCar = "site-guide-car";

    public static bool IsKnownKey(string? key) =>
        key is FirstEntry or Enabled or Disabled
            or CarGuideWelcome or CarGuideRotate or CarGuideZoom or CarGuideParts or CarGuideQuality
            or SiteGuideWelcome or SiteGuideTraining or SiteGuideSigns or SiteGuideExam or SiteGuidePractical or SiteGuideCar;
}
