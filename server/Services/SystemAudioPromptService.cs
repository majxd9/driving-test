using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public sealed class SystemAudioPromptService
{
    private const string VoiceId = "0IwoSbTUTTn6egOMrnel";

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
            SystemAudioCatalog.CarGuideQuality,
            SystemAudioCatalog.SiteGuideWelcome,
            SystemAudioCatalog.SiteGuideTraining,
            SystemAudioCatalog.SiteGuideSigns,
            SystemAudioCatalog.SiteGuideExam,
            SystemAudioCatalog.SiteGuidePractical,
            SystemAudioCatalog.SiteGuideCar
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
                _logger.LogWarning(ex, "Optional guide audio generation failed for {Key}; the interface can use device speech.", key);
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

        var result = await GenerateTextAsync(prompt.Text, cancellationToken);

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
        CancellationToken cancellationToken)
    {
        var provider = (_configuration["QUESTION_AUDIO_PROVIDER"] ?? "fish").Trim().ToLowerInvariant();
        var usesConfiguredProvider = provider is "fish" or "fishaudio" or "local" or "edenai";
        var voiceId = usesConfiguredProvider ? null : VoiceId;

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
        SystemAudioCatalog.SiteGuideWelcome => (SystemAudioCatalog.SiteGuideWelcome, "أهلاً بك في رخصتي. اختر أحد أقسام التدريب لمراجعة قواعد السير أو الإشارات المرورية أو أساسيات الميكانيك، ويمكنك فتح نماذج الاختبار لمحاكاة الامتحان."),
        SystemAudioCatalog.SiteGuideTraining => (SystemAudioCatalog.SiteGuideTraining, "ابدأ من قسم التدريب، واختر قواعد السير أو الإشارات المرورية أو الميكانيك. اقرأ السؤال والصورة، ثم اختر الإجابة وراجع التفسير قبل الانتقال إلى السؤال التالي."),
        SystemAudioCatalog.SiteGuideSigns => (SystemAudioCatalog.SiteGuideSigns, "في قسم الإشارات المرورية، افحص شكل الإشارة ولونها ورمزها قبل اختيار المعنى. تظهر لك المراجعة بعد الإجابة لتتعلم من الخطأ."),
        SystemAudioCatalog.SiteGuideExam => (SystemAudioCatalog.SiteGuideExam, "من زر اختيار النموذج، افتح أحد نماذج الاختبار. يتكوّن الاختبار من ثلاثين سؤالاً خلال خمس عشرة دقيقة، ثم تظهر لك النتيجة ومراجعة الإجابات."),
        SystemAudioCatalog.SiteGuidePractical => (SystemAudioCatalog.SiteGuidePractical, "قسم المعلومات العملية يشرح أساسيات استخدام أضواء السيارة والغمازات، مع عناصر تفاعلية تساعدك على التعرف على الحالات وطريقة الاستخدام."),
        SystemAudioCatalog.SiteGuideCar => (SystemAudioCatalog.SiteGuideCar, "في استعراض السيارة ثلاثية الأبعاد، اختر السيارة من القائمة، واسحب لتدويرها، واستخدم التكبير والتصغير لرؤية التفاصيل. اختر قسماً لعرض الأجزاء الرئيسية."),
        _ => throw new ArgumentException("رسالة صوت نظامية غير معروفة.", nameof(key))
    };
}
