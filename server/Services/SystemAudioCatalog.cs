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

    public const string SiteAssistantSigns = "site-assistant-signs";
    public const string SiteAssistantMechanic = "site-assistant-mechanic";
    public const string SiteAssistantTraining = "site-assistant-training";
    public const string SiteAssistantExam = "site-assistant-exam";
    public const string SiteAssistantModels = "site-assistant-models";
    public const string SiteAssistantCar = "site-assistant-car";
    public const string SiteAssistantPractical = "site-assistant-practical";
    public const string SiteAssistantHome = "site-assistant-home";
    public const string SiteAssistantRules = "site-assistant-rules";
    public const string SiteAssistantPublicSigns = "site-assistant-public-signs";
    public const string SiteAssistantWelcome = "site-assistant-welcome";

    public static bool IsSiteAssistantKey(string? key) =>
        key is SiteAssistantSigns or SiteAssistantMechanic or SiteAssistantTraining
            or SiteAssistantExam or SiteAssistantModels or SiteAssistantCar
            or SiteAssistantPractical or SiteAssistantHome or SiteAssistantRules
            or SiteAssistantPublicSigns or SiteAssistantWelcome;


    public static bool IsKnownKey(string? key) =>
        key is FirstEntry or Enabled or Disabled
            or CarGuideWelcome or CarGuideRotate or CarGuideZoom or CarGuideParts or CarGuideQuality
            or SiteAssistantSigns or SiteAssistantMechanic or SiteAssistantTraining
            or SiteAssistantExam or SiteAssistantModels or SiteAssistantCar
            or SiteAssistantPractical or SiteAssistantHome or SiteAssistantRules
            or SiteAssistantPublicSigns or SiteAssistantWelcome;
}
