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
            SystemAudioCatalog.SiteAssistantWelcome,
            SystemAudioCatalog.SiteAssistantLogin,
            SystemAudioCatalog.SiteAssistantResult,
            SystemAudioCatalog.SiteAssistantAbout,
            SystemAudioCatalog.SiteAssistantSyria,
            SystemAudioCatalog.SiteAssistantNotFound
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
        var hashSource = prompt.Text;

        // Version site-assistant audio by provider and voice so existing database clips
        // are regenerated when Deli's primary voice changes; text-only hashes would keep
        // serving older cached audio even though the voice configuration is now correct.
        if (SystemAudioCatalog.IsSiteAssistantKey(key))
        {
            var provider = (_configuration["QUESTION_AUDIO_PROVIDER"] ?? "fish").Trim().ToLowerInvariant();
            var configuredVoiceId = (_configuration["FISH_AUDIO_SITE_ASSISTANT_VOICE_ID"]
                ?? DefaultSiteAssistantVoiceId).Trim();
            var voiceSignature = provider is "fish" or "fishaudio"
                ? (string.IsNullOrWhiteSpace(configuredVoiceId) ? DefaultSiteAssistantVoiceId : configuredVoiceId)
                : "provider-default";
            hashSource = $"deli-site-assistant-audio-v1|provider={provider}|voice={voiceSignature}|text={prompt.Text}";
        }

        var hash = QuestionAudioTextBuilder.HashText(hashSource);

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
        SystemAudioCatalog.SiteAssistantSigns => (SystemAudioCatalog.SiteAssistantSigns, "في تدريب الإشارات، لاحظ الشكل واللون والرمز، ثم اختر الإجابة وراجع التفسير."),
        SystemAudioCatalog.SiteAssistantMechanic => (SystemAudioCatalog.SiteAssistantMechanic, "في الميكانيك، تعرّف على الجزء ووظيفته، اختر الإجابة، ثم راجع التفسير."),
        SystemAudioCatalog.SiteAssistantTraining => (SystemAudioCatalog.SiteAssistantTraining, "اقرأ السؤال والصورة بهدوء، اختر الإجابة، ثم راجع التفسير قبل السؤال التالي."),
        SystemAudioCatalog.SiteAssistantExam => (SystemAudioCatalog.SiteAssistantExam, "أنت في الاختبار؛ اقرأ السؤال جيداً واختر إجابتك قبل انتهاء الوقت."),
        SystemAudioCatalog.SiteAssistantModels => (SystemAudioCatalog.SiteAssistantModels, "اختر نموذج الاختبار المناسب. بعد الانتهاء ستظهر نتيجتك ويمكنك مراجعة الإجابات."),
        SystemAudioCatalog.SiteAssistantCar => (SystemAudioCatalog.SiteAssistantCar, "اسحب السيارة لتدويرها، وكبّر لرؤية التفاصيل، واختر قطعة لمعرفة اسمها ومكانها."),
        SystemAudioCatalog.SiteAssistantPractical => (SystemAudioCatalog.SiteAssistantPractical, "هنا تتعرّف على استخدام أضواء السيارة والغمازات. استعرض الأمثلة ثم جرّبها."),
        SystemAudioCatalog.SiteAssistantHome => (SystemAudioCatalog.SiteAssistantHome, "من هنا تبدأ التدريب، وتتعلّم الإشارات والميكانيك، أو تدخل نموذج اختبار."),
        SystemAudioCatalog.SiteAssistantRules => (SystemAudioCatalog.SiteAssistantRules, "استعرض قواعد السير الأساسية، ثم انتقل إلى التدريب لتجربة ما تعلمته."),
        SystemAudioCatalog.SiteAssistantPublicSigns => (SystemAudioCatalog.SiteAssistantPublicSigns, "استعرض الإشارات ومعانيها، ثم اختبر فهمك من قسم التدريب."),
        SystemAudioCatalog.SiteAssistantWelcome => (SystemAudioCatalog.SiteAssistantWelcome, "أهلاً بك في رخصتي. اضغط على ديلي متى احتجت مساعدة في الصفحة."),
        SystemAudioCatalog.SiteAssistantLogin => (SystemAudioCatalog.SiteAssistantLogin, "أهلاً بك! سجّل الدخول للمتابعة إلى تدريباتك ونماذج الاختبار."),
        SystemAudioCatalog.SiteAssistantResult => (SystemAudioCatalog.SiteAssistantResult, "هذه نتيجتك. راجع إجاباتك، وركّز على النقاط التي تحتاج إلى تدريب إضافي."),
        SystemAudioCatalog.SiteAssistantAbout => (SystemAudioCatalog.SiteAssistantAbout, "هنا تجد نبذة عن رخصتي وكيف يساعدك على الاستعداد لاختبار القيادة."),
        SystemAudioCatalog.SiteAssistantSyria => (SystemAudioCatalog.SiteAssistantSyria, "تعرّف على معلومات امتحان القيادة في سوريا، ثم تدرّب على الإشارات والقواعد."),
        SystemAudioCatalog.SiteAssistantNotFound => (SystemAudioCatalog.SiteAssistantNotFound, "لم أجد الصفحة المطلوبة. ارجع للرئيسية أو اختر أحد أقسام رخصتي."),
        _ => throw new ArgumentException("رسالة صوت نظامية غير معروفة.", nameof(key))
    };
}
