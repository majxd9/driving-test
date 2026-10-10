using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public sealed class SystemAudioPromptService
{
    private const string VoiceId = "0IwoSbTUTTn6egOMrnel";
    private const string DefaultSiteAssistantVoiceId = "9ae8ab5e6db14f12bac954621f68bfae";

    private readonly AppDbContext _db;
    private readonly ITextToSpeechGenerator _audioGenerator;
    private readonly FallbackQuestionAudioGenerator _fallbackAudioGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SystemAudioPromptService> _logger;

    public SystemAudioPromptService(
        AppDbContext db,
        ITextToSpeechGenerator audioGenerator,
        FallbackQuestionAudioGenerator fallbackAudioGenerator,
        IConfiguration configuration,
        ILogger<SystemAudioPromptService> logger)
    {
        _db = db;
        _audioGenerator = audioGenerator;
        _fallbackAudioGenerator = fallbackAudioGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task EnsureAllAsync(CancellationToken cancellationToken)
    {
        var prompts = new[]
        {
            SystemAudioCatalog.FirstEntry,
            SystemAudioCatalog.Enabled,
            SystemAudioCatalog.Disabled
        };

        var changed = 0;
        foreach (var key in prompts)
        {
            changed += await EnsurePromptAsync(key, cancellationToken) ? 1 : 0;
        }

        // These short guide clips are optional: audio-provider quota/configuration
        // issues must not prevent the viewer or existing system prompts from working.
        var guidePrompts = new[]
        {
            SystemAudioCatalog.CarGuideWelcome,
            SystemAudioCatalog.CarGuideRotate,
            SystemAudioCatalog.CarGuideZoom,
            SystemAudioCatalog.CarGuideParts,
            SystemAudioCatalog.CarGuideQuality
        };

        foreach (var key in guidePrompts)
        {
            try
            {
                changed += await EnsurePromptAsync(key, cancellationToken) ? 1 : 0;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Optional car-guide audio generation failed for {Key}; the viewer can use device speech.", key);
            }
        }

        // New site-assistant clips are stored separately from question and car-guide audio.
        var siteAssistantPrompts = new[]
        {
            SystemAudioCatalog.SiteAssistantSigns,
            SystemAudioCatalog.SiteAssistantMechanic,
            SystemAudioCatalog.SiteAssistantTraining,
            SystemAudioCatalog.SiteAssistantExam,
            SystemAudioCatalog.SiteAssistantModels,
            SystemAudioCatalog.SiteAssistantCar,
            SystemAudioCatalog.SiteAssistantPractical,
            SystemAudioCatalog.SiteAssistantHome,
            SystemAudioCatalog.SiteAssistantRules,
            SystemAudioCatalog.SiteAssistantPublicSigns,
            SystemAudioCatalog.SiteAssistantWelcome
        };

        foreach (var key in siteAssistantPrompts)
        {
            try
            {
                changed += await EnsurePromptAsync(key, cancellationToken) ? 1 : 0;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Optional site-assistant audio generation failed for {Key}; browser speech remains available as a fallback.", key);
            }
        }

        if (changed > 0)
            _logger.LogInformation("System audio prompts generated/restored: {Count}.", changed);
    }

    public async Task<bool> EnsurePromptAsync(
        string key,
        CancellationToken cancellationToken)
    {
        var prompt = GetPrompt(key);
        var hash = QuestionAudioTextBuilder.HashText(prompt.Text);

        var existing = await _db.SystemAudios
            .SingleOrDefaultAsync(x => x.Key == prompt.Key, cancellationToken);

        if (existing is not null &&
            existing.ContentHash == hash &&
            existing.AudioBytes.Length > 0)
        {
            return false;
        }

        var result = await GenerateTextAsync(prompt.Text, cancellationToken, SystemAudioCatalog.IsSiteAssistantKey(key));

        if (result.Bytes.Length == 0)
            throw new InvalidOperationException(
                $"تعذر إنشاء رسالة الصوت النظامية: {prompt.Key}");

        if (existing is null)
        {
            _db.SystemAudios.Add(new SystemAudio
            {
                Key = prompt.Key,
                AudioBytes = result.Bytes,
                ContentHash = hash,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.AudioBytes = result.Bytes;
            existing.ContentHash = hash;
            existing.CreatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("System audio prompt generated/restored: {Key}.", prompt.Key);
        return true;
    }

    private async Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        CancellationToken cancellationToken,
        bool useSiteAssistantVoice = false)
    {
        var provider = (_configuration["QUESTION_AUDIO_PROVIDER"] ?? "fish").Trim().ToLowerInvariant();
        var usesConfiguredProvider = provider is "fish" or "fishaudio" or "local" or "edenai";
        var voiceId = usesConfiguredProvider ? null : VoiceId;

        // Dedicated voice applies only to the new site-assistant prompts on Fish Audio.
        if (useSiteAssistantVoice && (provider is "fish" or "fishaudio"))
        {
            var configuredVoiceId = (_configuration["FISH_AUDIO_SITE_ASSISTANT_VOICE_ID"]
                ?? DefaultSiteAssistantVoiceId).Trim();
            voiceId = string.IsNullOrWhiteSpace(configuredVoiceId)
                ? DefaultSiteAssistantVoiceId
                : configuredVoiceId;
        }

        try
        {
            return await _audioGenerator.GenerateTextAsync(text, voiceId, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception primaryError) when (usesConfiguredProvider)
        {
            _logger.LogWarning(
                primaryError,
                "Configured audio provider {Provider} failed for a system prompt. Trying the existing ElevenLabs/Eden AI fallback.",
                provider);

            return await _fallbackAudioGenerator.GenerateTextAsync(text, VoiceId, cancellationToken);
        }
    }

    private static (string Key, string Text) GetPrompt(string key) => key switch
    {
        SystemAudioCatalog.FirstEntry => (SystemAudioCatalog.FirstEntry, "إذا بدك تشغيل الصوت، اضغط زر التشغيل."),
        SystemAudioCatalog.Enabled => (SystemAudioCatalog.Enabled, "الصوت سيبقى شغال حتى تضغط إيقاف."),
        SystemAudioCatalog.Disabled => (SystemAudioCatalog.Disabled, "الصوت متوقف."),
        SystemAudioCatalog.CarGuideWelcome => (SystemAudioCatalog.CarGuideWelcome, "أهلاً بك في استوديو السيارات ثلاثي الأبعاد. اختر السيارة من أعلى الصفحة، ثم اختر موضوعاً من هذا المساعد للتعرّف على أدوات العرض."),
        SystemAudioCatalog.CarGuideRotate => (SystemAudioCatalog.CarGuideRotate, "اسحب على مساحة السيارة لتدويرها ورؤية الجوانب المختلفة. على الهاتف استخدم إصبعاً واحداً للتدوير."),
        SystemAudioCatalog.CarGuideZoom => (SystemAudioCatalog.CarGuideZoom, "استخدم زري التكبير والتصغير أسفل المجسم، أو عجلة الفأرة على الكمبيوتر. اضغط إعادة ضبط للعودة إلى زاوية البداية."),
        SystemAudioCatalog.CarGuideParts => (SystemAudioCatalog.CarGuideParts, "اختر الهيكل أو المحرك أو المقصورة أو الإضاءة أو العجلات من القائمة. عند اختيار قطعة ستظهر محددة على المجسم، ويمكنك تحريكها بأزرار الاتجاهات."),
        SystemAudioCatalog.CarGuideQuality => (SystemAudioCatalog.CarGuideQuality, "اختر الجودة الاقتصادية عند بطء الجهاز أو الاتصال، والمتوسطة للتوازن، والعالية عندما يكون الجهاز قادراً على تشغيل التفاصيل بسلاسة."),
        SystemAudioCatalog.SiteAssistantSigns => (SystemAudioCatalog.SiteAssistantSigns, "هذه صفحة تدريب الإشارات. انتبه لشكل الإشارة ولونها ورمزها، واختر الإجابة ثم راجع التفسير."),
        SystemAudioCatalog.SiteAssistantMechanic => (SystemAudioCatalog.SiteAssistantMechanic, "هذه صفحة تدريب الميكانيك. ركّز على اسم الجزء الرئيسي ووظيفته، ثم اختر الإجابة وراجع التفسير."),
        SystemAudioCatalog.SiteAssistantTraining => (SystemAudioCatalog.SiteAssistantTraining, "هذه صفحة التدريب. اقرأ السؤال والصورة جيداً، واختر الإجابة، ثم راجع التفسير قبل الانتقال للسؤال التالي."),
        SystemAudioCatalog.SiteAssistantExam => (SystemAudioCatalog.SiteAssistantExam, "أنت في صفحة الاختبار. اقرأ السؤال جيداً وانتبه للوقت، واختر الإجابة التي تراها صحيحة."),
        SystemAudioCatalog.SiteAssistantModels => (SystemAudioCatalog.SiteAssistantModels, "من هنا تختار نموذج الاختبار. بعد الانتهاء تظهر النتيجة ويمكنك مراجعة إجاباتك."),
        SystemAudioCatalog.SiteAssistantCar => (SystemAudioCatalog.SiteAssistantCar, "في عارض السيارة اسحب المجسم لتدويره، واستخدم التقريب، ثم اختر قطعة من القائمة لمعرفة مكانها."),
        SystemAudioCatalog.SiteAssistantPractical => (SystemAudioCatalog.SiteAssistantPractical, "هذه صفحة المعلومات العملية، وفيها أمثلة عن أضواء السيارة والغمازات وطريقة استخدامها."),
        SystemAudioCatalog.SiteAssistantHome => (SystemAudioCatalog.SiteAssistantHome, "من الصفحة الرئيسية افتح التدريب، أو الإشارات، أو الميكانيك، أو اختر أحد نماذج الاختبار."),
        SystemAudioCatalog.SiteAssistantRules => (SystemAudioCatalog.SiteAssistantRules, "راجع قواعد السير بهدوء، ويمكنك الانتقال إلى التدريب لتجربة أسئلة القواعد."),
        SystemAudioCatalog.SiteAssistantPublicSigns => (SystemAudioCatalog.SiteAssistantPublicSigns, "تعرّف على معاني الإشارات هنا، ثم اختبر معلوماتك في قسم التدريب."),
        SystemAudioCatalog.SiteAssistantWelcome => (SystemAudioCatalog.SiteAssistantWelcome, "أنا مساعدك في رخصتي. اضغط على الروبوت وسأشرح لك الصفحة الحالية بصوت عربي."),
        _ => throw new ArgumentException("رسالة صوت نظامية غير معروفة.", nameof(key))
    };
}
