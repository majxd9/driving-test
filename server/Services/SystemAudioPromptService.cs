using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace DrivingTestApi.Services;

public sealed class SystemAudioPromptService
{
    private const string VoiceId = "0IwoSbTUTTn6egOMrnel";
    private const string DefaultSiteAssistantVoiceId = "9ae8ab5e6db14f12bac954621f68bfae";
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> QuestionExplanationAudioLocks = new();

    private readonly AppDbContext _db;
    private readonly ITextToSpeechGenerator _audioGenerator;
    private readonly FishAudioQuestionAudioGenerator _fishAudioGenerator;
    private readonly FallbackQuestionAudioGenerator _fallbackAudioGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SystemAudioPromptService> _logger;

    public SystemAudioPromptService(
        AppDbContext db,
        ITextToSpeechGenerator audioGenerator,
        FishAudioQuestionAudioGenerator fishAudioGenerator,
        FallbackQuestionAudioGenerator fallbackAudioGenerator,
        IConfiguration configuration,
        ILogger<SystemAudioPromptService> logger)
    {
        _db = db;
        _audioGenerator = audioGenerator;
        _fishAudioGenerator = fishAudioGenerator;
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
            SystemAudioCatalog.CarGuideBody,
            SystemAudioCatalog.CarGuideHood,
            SystemAudioCatalog.CarGuideEngine,
            SystemAudioCatalog.CarGuideDoors,
            SystemAudioCatalog.CarGuideWheels,
            SystemAudioCatalog.CarGuideLights,
            SystemAudioCatalog.CarGuideSeats,
            SystemAudioCatalog.CarGuideSteering,
            SystemAudioCatalog.CarGuideDashboard,
            SystemAudioCatalog.CarGuideGlass,
            SystemAudioCatalog.CarGuideBumpers,
            SystemAudioCatalog.CarGuideMirrors,
            SystemAudioCatalog.CarGuideGrille,
            SystemAudioCatalog.CarGuideUnknownPart
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

        // Full explanation narration is generated lazily on first playback and cached per question.
        // This keeps Render cold starts quick and avoids spending Fish Audio quota on every unused explanation.

        if (changed > 0)
            _logger.LogInformation("System audio prompts generated/restored: {Count}.", changed);
    }

    public static string GetQuestionExplanationAudioKey(int questionId) =>
        $"question-explanation-{questionId}";

    public string GetQuestionExplanationAudioHash(Question question)
    {
        var explanation = question.Explanation?.Trim() ?? string.Empty;
        var configuredVoiceId = (_configuration["FISH_AUDIO_SITE_ASSISTANT_VOICE_ID"]
            ?? DefaultSiteAssistantVoiceId).Trim();
        var voiceSignature = string.IsNullOrWhiteSpace(configuredVoiceId)
            ? DefaultSiteAssistantVoiceId
            : configuredVoiceId;
        return QuestionAudioTextBuilder.HashText(
            $"deli-question-explanation-audio-v2|id={question.Id}|provider=fish|voice={voiceSignature}|text={explanation}");
    }

    public async Task<bool> EnsureQuestionExplanationAudioAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(question.Explanation)) return false;

        // A startup warmup and a student's first playback can race. Serialize per question
        // so Fish Audio is not billed twice for the same text/voice on this API instance.
        var gate = QuestionExplanationAudioLocks.GetOrAdd(question.Id, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await EnsureQuestionExplanationAudioCoreAsync(question, cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<bool> EnsureQuestionExplanationAudioCoreAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var explanation = question.Explanation?.Trim();
        if (string.IsNullOrWhiteSpace(explanation)) return false;

        var key = GetQuestionExplanationAudioKey(question.Id);
        var hash = GetQuestionExplanationAudioHash(question);
        var existing = await _db.SystemAudios
            .SingleOrDefaultAsync(audio => audio.Key == key, cancellationToken);

        if (existing is not null &&
            existing.ContentHash == hash &&
            existing.AudioBytes.Length > 0)
        {
            return false;
        }

        var result = await GenerateTextWithQuotaAsync(
            explanation,
            cancellationToken,
            useDeliVoice: true);
        if (result.Bytes.Length == 0)
            throw new InvalidOperationException($"تعذر إنشاء صوت شرح السؤال {question.Id}.");

        if (existing is null)
        {
            _db.SystemAudios.Add(new SystemAudio
            {
                Key = key,
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
        return true;
    }

    public async Task<SystemAudio?> GetCurrentQuestionExplanationAudioAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(question.Explanation)) return null;

        var key = GetQuestionExplanationAudioKey(question.Id);
        var expectedHash = GetQuestionExplanationAudioHash(question);
        var stored = await _db.SystemAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(audio => audio.Key == key, cancellationToken);

        return stored is not null &&
               stored.AudioBytes.Length > 0 &&
               stored.ContentHash == expectedHash
            ? stored
            : null;
    }

    public async Task<SystemAudio?> GetOrCreateQuestionExplanationAudioAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(question.Explanation)) return null;

        // Most requests are cache hits. Missing/stale clips are generated once, persisted
        // in SystemAudios (PostgreSQL), and then reused across page visits and API restarts.
        var cached = await GetCurrentQuestionExplanationAudioAsync(question, cancellationToken);
        if (cached is not null) return cached;

        await EnsureQuestionExplanationAudioAsync(question, cancellationToken);
        return await GetCurrentQuestionExplanationAudioAsync(question, cancellationToken);
    }

    private static readonly ConcurrentDictionary<string, SemaphoreSlim> PromptLocks = new(StringComparer.Ordinal);

    public async Task<bool> EnsurePromptAsync(
        string key,
        CancellationToken cancellationToken)
    {
        var gate = PromptLocks.GetOrAdd(key, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await EnsurePromptCoreAsync(key, cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<bool> EnsurePromptCoreAsync(
        string key,
        CancellationToken cancellationToken)
    {
        var prompt = GetPrompt(key);
        var hashSource = prompt.Text;

        // Include provider and voice in the cache hash for all Deli narration. This refreshes
        // previously stored clips instead of accidentally continuing to play an older voice.
        if (SystemAudioCatalog.UsesDeliVoice(key))
        {
            var configuredVoiceId = (_configuration["FISH_AUDIO_SITE_ASSISTANT_VOICE_ID"]
                ?? DefaultSiteAssistantVoiceId).Trim();
            var voiceSignature = string.IsNullOrWhiteSpace(configuredVoiceId)
                ? DefaultSiteAssistantVoiceId
                : configuredVoiceId;
            hashSource = $"deli-assistant-audio-v2|provider=fish|voice={voiceSignature}|text={prompt.Text}";
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

        var result = await GenerateTextWithQuotaAsync(
            prompt.Text,
            cancellationToken,
            SystemAudioCatalog.UsesDeliVoice(key));

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

    private async Task<GeneratedAudioResult> GenerateTextWithQuotaAsync(
        string text,
        CancellationToken cancellationToken,
        bool useDeliVoice = false)
    {
        var quota = new AiGenerationQuotaService(_db, _configuration);

        // Deli always uses Fish Audio even if the general question-audio provider
        // is configured as local. Therefore Deli clips must always consume the
        // shared monthly allowance. Only non-Deli local TTS is exempt.
        if (!useDeliVoice && quota.IsUnlimited(AiGenerationJobType.Audio))
            return await GenerateTextAsync(text, cancellationToken, useDeliVoice: false);

        var monthStartUtc = quota.CurrentMonthStartUtc;
        if (!await quota.TryConsumeAsync(monthStartUtc, cancellationToken))
            throw new AiGenerationQuotaExceededException(quota.NextMonthStartUtc);

        // Count provider attempts, not just successful cache writes: a failed upstream
        // request must not allow an unauthenticated caller to retry indefinitely.
        return await GenerateTextAsync(text, cancellationToken, useDeliVoice);
    }

    private async Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        CancellationToken cancellationToken,
        bool useDeliVoice = false)
    {
        // Deli must always use the same Fish Audio reference voice. Never store audio
        // generated by another provider under Deli's cache key.
        if (useDeliVoice)
        {
            var configuredVoiceId = (_configuration["FISH_AUDIO_SITE_ASSISTANT_VOICE_ID"]
                ?? DefaultSiteAssistantVoiceId).Trim();
            var voiceId = string.IsNullOrWhiteSpace(configuredVoiceId)
                ? DefaultSiteAssistantVoiceId
                : configuredVoiceId;
            return await _fishAudioGenerator.GenerateTextAsync(text, voiceId, cancellationToken);
        }

        var provider = (_configuration["QUESTION_AUDIO_PROVIDER"] ?? "fish").Trim().ToLowerInvariant();
        var usesConfiguredProvider = provider is "fish" or "fishaudio" or "local" or "edenai";
        var fallbackVoiceId = usesConfiguredProvider ? null : VoiceId;

        try
        {
            return await _audioGenerator.GenerateTextAsync(text, fallbackVoiceId, cancellationToken);
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
        SystemAudioCatalog.CarGuideBody => (SystemAudioCatalog.CarGuideBody, "الهيكل هو البنية الرئيسية التي تربط أجزاء السيارة وتحافظ على تماسكها وتساعد على حماية الركاب."),
        SystemAudioCatalog.CarGuideHood => (SystemAudioCatalog.CarGuideHood, "غطاء المحرك يغطي حجرة المحرك، ويمكن فتحه للوصول إلى المحرك وفحص السوائل وإجراء الصيانة."),
        SystemAudioCatalog.CarGuideEngine => (SystemAudioCatalog.CarGuideEngine, "المحرك يحوّل الطاقة إلى قوة حركة، وينقل ناقل الحركة هذه القوة إلى العجلات لتحريك السيارة."),
        SystemAudioCatalog.CarGuideDoors => (SystemAudioCatalog.CarGuideDoors, "الأبواب تسمح بدخول الركاب وخروجهم، وتساعد على إغلاق المقصورة وحماية من بداخل السيارة."),
        SystemAudioCatalog.CarGuideWheels => (SystemAudioCatalog.CarGuideWheels, "العجلات والإطارات تلامس الطريق، وتحمل وزن السيارة وتوفر التماسك والتوجيه والفرملة."),
        SystemAudioCatalog.CarGuideLights => (SystemAudioCatalog.CarGuideLights, "المصابيح تنير الطريق وتُظهر السيارة للآخرين، وتشمل أضواء المقدمة والخلف والإشارات الضوئية."),
        SystemAudioCatalog.CarGuideSeats => (SystemAudioCatalog.CarGuideSeats, "المقاعد تدعم السائق والركاب وتساعدهم على الجلوس بثبات، وتعمل مع أحزمة الأمان لتقليل الإصابات."),
        SystemAudioCatalog.CarGuideSteering => (SystemAudioCatalog.CarGuideSteering, "المقود يتحكم باتجاه السيارة؛ فعند تدويره ينقل نظام التوجيه الحركة إلى العجلات الأمامية عادةً."),
        SystemAudioCatalog.CarGuideDashboard => (SystemAudioCatalog.CarGuideDashboard, "لوحة القيادة تعرض معلومات السرعة والتحذيرات وحالة الأنظمة، وتضم أدوات التحكم التي يحتاجها السائق."),
        SystemAudioCatalog.CarGuideGlass => (SystemAudioCatalog.CarGuideGlass, "الزجاج الأمامي والنوافذ توفر الرؤية للسائق وتحمي المقصورة من الهواء والعوامل الخارجية."),
        SystemAudioCatalog.CarGuideBumpers => (SystemAudioCatalog.CarGuideBumpers, "الصدامات تقع في مقدمة السيارة ومؤخرتها، وتساعد على امتصاص بعض طاقة الصدمات البسيطة وحماية أجزاء الهيكل."),
        SystemAudioCatalog.CarGuideMirrors => (SystemAudioCatalog.CarGuideMirrors, "المرايا تساعد السائق على رؤية ما خلف السيارة وعلى جانبيها وتقليل المناطق غير المرئية أثناء القيادة."),
        SystemAudioCatalog.CarGuideGrille => (SystemAudioCatalog.CarGuideGrille, "شبك الواجهة يسمح بمرور الهواء إلى منطقة التبريد، ويساعد على حماية المبرد ويكمل تصميم مقدمة السيارة."),
        SystemAudioCatalog.CarGuideUnknownPart => (SystemAudioCatalog.CarGuideUnknownPart, "هذا جزء من السيارة. اختر اسماً واضحاً من قائمة الأجزاء لمعرفة وظيفته بالتحديد."),
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
