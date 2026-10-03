using System.Security.Cryptography;
using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DrivingTestApi.Services;

public sealed class AiGenerationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AiGenerationWorker> _logger;
    private readonly IConfiguration _configuration;

    public AiGenerationWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<AiGenerationWorker> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();

        var scanSeconds = Math.Clamp(
            _configuration.GetValue("AI_QUEUE_SCAN_SECONDS", 30),
            5,
            3600);

        var pollSeconds = Math.Clamp(
            _configuration.GetValue("AI_QUEUE_POLL_SECONDS", 3),
            1,
            60);

        var scanEvery = TimeSpan.FromSeconds(scanSeconds);
        var pollEvery = TimeSpan.FromSeconds(pollSeconds);

        var nextScan = DateTime.UtcNow;
        var invalidImageStateCleaned = false;
        var controlStorageReady = false;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var jobs = scope.ServiceProvider.GetRequiredService<AiGenerationJobService>();

                if (!controlStorageReady)
                {
                    await jobs.EnsureControlStorageAsync(stoppingToken);
                    controlStorageReady = true;
                }

                if (!invalidImageStateCleaned)
                {
                    await jobs.CleanupInvalidImageGenerationStateAsync(stoppingToken);
                    invalidImageStateCleaned = true;
                }

                await jobs.ResetStaleProcessingAsync(stoppingToken);
                await jobs.ResumeProviderPausedJobsForFallbackAsync(stoppingToken);
                await jobs.PrepareImageQueueForCurrentProviderAsync(stoppingToken);

                if (DateTime.UtcNow >= nextScan)
                {
                    await jobs.EnqueueMissingAsync(stoppingToken);
                    nextScan = DateTime.UtcNow.Add(scanEvery);
                }

                var claimed = await jobs.ClaimNextJobAsync(stoppingToken);
                if (claimed is not null)
                {
                    await ProcessAsync(claimed, stoppingToken);
                    continue;
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI generation worker loop failed.");
            }

            await Task.Delay(pollEvery, stoppingToken);
        }
    }

    private async Task ProcessAsync(
        AiGenerationJob claimed,
        CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var generationJobs = scope.ServiceProvider.GetRequiredService<AiGenerationJobService>();
        var quota = new AiGenerationQuotaService(db, _configuration);
        var quotaConsumed = false;

        try
        {
            var question = await db.Questions
                .AsNoTracking()
                .SingleOrDefaultAsync(q => q.Id == claimed.QuestionId, cancellationToken);

            if (question is null)
            {
                await CompleteJobAsync(
                    db,
                    claimed.Id,
                    "تم تجاهل المهمة لأن السؤال لم يعد موجوداً.",
                    cancellationToken);
                return;
            }

            var control = await generationJobs.GetControlStateAsync(cancellationToken);
            var generationEnabled = claimed.JobType == AiGenerationJobType.Audio
                ? control.AudioEnabled
                : control.ImageEnabled;

            if (!generationEnabled)
            {
                await ReleaseJobAsync(
                    db,
                    claimed.Id,
                    "تم إيقاف هذا النوع من التوليد من مركز التحكم.",
                    cancellationToken,
                    DateTime.UtcNow.AddDays(3650));
                return;
            }

            if (claimed.JobType == AiGenerationJobType.Audio)
            {
                if (QuestionAudioTextBuilder.GetCurrentHash(question) != claimed.ContentHash)
                {
                    await CompleteJobAsync(
                        db,
                        claimed.Id,
                        "تم تجاهل الناتج لأن محتوى السؤال تغيّر قبل اكتمال المهمة.",
                        cancellationToken);
                    return;
                }

                if (!quota.IsUnlimited(AiGenerationJobType.Audio) &&
                    !await quota.TryConsumeAsync(cancellationToken))
                {
                    await ReleaseJobAsync(
                        db,
                        claimed.Id,
                        "تم بلوغ الحد الشهري لتوليد AI؛ ستُستأنف المهمة تلقائياً في بداية الشهر القادم.",
                        cancellationToken,
                        quota.NextMonthStartUtc);
                    return;
                }

                quotaConsumed = !quota.IsUnlimited(AiGenerationJobType.Audio);

                var generator = scope.ServiceProvider
                    .GetRequiredService<IQuestionAudioGenerator>();

                var result = await generator.GenerateAsync(
                    question,
                    cancellationToken);

                var currentQuestionAfterGeneration = await db.Questions
                    .AsNoTracking()
                    .SingleOrDefaultAsync(q => q.Id == question.Id, cancellationToken);

                if (currentQuestionAfterGeneration is null)
                {
                    if (quotaConsumed)
                        await quota.ReleaseAsync(cancellationToken);

                    await CompleteJobAsync(
                        db,
                        claimed.Id,
                        "تم تجاهل الناتج لأن السؤال حُذف أثناء التوليد.",
                        cancellationToken);
                    return;
                }

                if (QuestionAudioTextBuilder.GetCurrentHash(currentQuestionAfterGeneration) != claimed.ContentHash)
                {
                    if (quotaConsumed)
                        await quota.ReleaseAsync(cancellationToken);

                    await CompleteJobAsync(
                        db,
                        claimed.Id,
                        "تم تجاهل الناتج لأن محتوى السؤال تغيّر أثناء التوليد ولم يتم حفظ الصوت القديم.",
                        cancellationToken);
                    return;
                }

                var audio = await db.QuestionAudios
                    .SingleOrDefaultAsync(
                        x => x.QuestionId == question.Id,
                        cancellationToken);

                if (audio is null)
                {
                    db.QuestionAudios.Add(new QuestionAudio
                    {
                        QuestionId = question.Id,
                        AudioBytes = result.Bytes,
                        ContentHash = claimed.ContentHash,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    audio.AudioBytes = result.Bytes;
                    audio.ContentHash = claimed.ContentHash;
                    audio.CreatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                var imageGenerationEnabled =
                    scope.ServiceProvider.GetRequiredService<IConfiguration>()
                        .GetValue("AI_IMAGE_GENERATION_ENABLED", false);

                if (!imageGenerationEnabled)
                {
                    await ReleaseJobAsync(
                        db,
                        claimed.Id,
                        "تم إيقاف توليد صور AI مؤقتاً؛ لم يتم تشغيل أي توليد للصورة.",
                        cancellationToken,
                        DateTime.UtcNow.AddHours(24));
                    return;
                }

                var provider =
                    scope.ServiceProvider.GetRequiredService<IConfiguration>()["QUESTION_IMAGE_PROVIDER"];

                if (string.Equals(
                    provider ?? "none",
                    "none",
                    StringComparison.OrdinalIgnoreCase))
                {
                    await ReleaseJobAsync(
                        db,
                        claimed.Id,
                        "مزود صور AI غير مفعّل حالياً؛ بقيت المهمة معلّقة.",
                        cancellationToken);
                    return;
                }

                if (QuestionImagePromptBuilder.GetContentHash(question) != claimed.ContentHash)
                {
                    await CompleteJobAsync(
                        db,
                        claimed.Id,
                        "تم تجاهل الناتج لأن محتوى السؤال تغيّر قبل اكتمال المهمة.",
                        cancellationToken);
                    return;
                }

                if (!quota.IsUnlimited(AiGenerationJobType.AiImage) &&
                    !await quota.TryConsumeAsync(cancellationToken))
                {
                    await ReleaseJobAsync(
                        db,
                        claimed.Id,
                        "تم بلوغ الحد الشهري لتوليد AI؛ ستُستأنف المهمة تلقائياً في بداية الشهر القادم.",
                        cancellationToken,
                        quota.NextMonthStartUtc);
                    return;
                }

                quotaConsumed = !quota.IsUnlimited(AiGenerationJobType.AiImage);

                var promptFromBank = ScenePromptBank.TryGet(question, out var storedScenePrompt);
                var executionProvider = generationJobs.ImageExecutionProvider;

                _logger.LogInformation(
                    "Starting AI image generation. Job {JobId}, Question {QuestionId}, Attempt {Attempt}, ImageProvider {ImageProvider}, ExecutionProvider {ExecutionProvider}, PromptSource {PromptSource}, PromptBankEntries {PromptBankEntries}, PromptLength {PromptLength}, ContentHash {ContentHash}.",
                    claimed.Id,
                    question.Id,
                    claimed.Attempts,
                    provider ?? "none",
                    executionProvider,
                    promptFromBank ? "ScenePromptBank" : "FallbackBuilder",
                    ScenePromptBank.Count,
                    promptFromBank ? storedScenePrompt.Positive.Length : 0,
                    claimed.ContentHash);

                var generator = scope.ServiceProvider
                    .GetRequiredService<IQuestionImageGenerator>();

                _logger.LogInformation(
                    "AI image generator implementation: {GeneratorType}.",
                    generator.GetType().FullName);

                var result = await generator.GenerateAsync(
                    question,
                    cancellationToken);

                var currentQuestionAfterGeneration = await db.Questions
                    .AsNoTracking()
                    .SingleOrDefaultAsync(q => q.Id == question.Id, cancellationToken);

                if (currentQuestionAfterGeneration is null)
                {
                    if (quotaConsumed)
                        await quota.ReleaseAsync(cancellationToken);

                    await CompleteJobAsync(
                        db,
                        claimed.Id,
                        "تم تجاهل الناتج لأن السؤال حُذف أثناء التوليد.",
                        cancellationToken);
                    return;
                }

                if (QuestionImagePromptBuilder.GetContentHash(currentQuestionAfterGeneration) != claimed.ContentHash)
                {
                    if (quotaConsumed)
                        await quota.ReleaseAsync(cancellationToken);

                    await CompleteJobAsync(
                        db,
                        claimed.Id,
                        "تم تجاهل الناتج لأن محتوى السؤال تغيّر أثناء التوليد ولم يتم حفظ الصورة القديمة.",
                        cancellationToken);
                    return;
                }

                _logger.LogInformation(
                    "AI image generation provider returned successfully. Job {JobId}, Question {QuestionId}, Bytes {Bytes}, ContentType {ContentType}.",
                    claimed.Id,
                    question.Id,
                    result.Bytes.Length,
                    result.ContentType);

                var imageHash = Convert.ToHexString(
                    SHA256.HashData(result.Bytes)).ToLowerInvariant();

                // Never accept the exact same generated file for two different
                // questions. This is a hard server-side guard against provider,
                // cache, or routing regressions producing one reused image.
                var duplicateImage = await db.QuestionAiImages
                    .AsNoTracking()
                    .AnyAsync(
                        x => x.QuestionId != question.Id &&
                             x.ImageBytes.Length > 0 &&
                             x.ImageHash == imageHash,
                        cancellationToken);

                if (duplicateImage)
                    throw new InvalidOperationException(
                        "تم رفض صورة AI لأن نفس ملف الصورة مستخدم بالفعل لسؤال آخر. ستتم إعادة المحاولة.");

                var image = await db.QuestionAiImages
                    .SingleOrDefaultAsync(
                        x => x.QuestionId == question.Id,
                        cancellationToken);

                var generatedAt = DateTime.UtcNow;

                if (image is null)
                {
                    db.QuestionAiImages.Add(new QuestionAiImage
                    {
                        QuestionId = question.Id,
                        ImageBytes = result.Bytes,
                        ContentHash = claimed.ContentHash,
                        ImageHash = imageHash,
                        ContentType = result.ContentType,
                        CreatedAt = generatedAt
                    });
                }
                else
                {
                    image.ImageBytes = result.Bytes;
                    image.ContentHash = claimed.ContentHash;
                    image.ImageHash = imageHash;
                    image.ContentType = result.ContentType;
                    image.CreatedAt = generatedAt;
                }

                // Every newly generated image is a review candidate first.
                await generationJobs.MarkImagePendingReviewAsync(
                    question.Id,
                    claimed.ContentHash,
                    generatedAt,
                    cancellationToken);
            }

            var job = await db.AiGenerationJobs
                .SingleAsync(x => x.Id == claimed.Id, cancellationToken);

            job.Status = AiGenerationJobStatus.Completed;
            job.LastError = null;
            job.NextAttemptAt = null;
            job.LockedUntil = null;
            job.UpdatedAt = DateTime.UtcNow;
            job.CompletedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            var providerConfigurationFailure = IsProviderConfigurationFailure(ex);

            if (quotaConsumed && providerConfigurationFailure)
            {
                try
                {
                    await quota.ReleaseAsync(cancellationToken);
                }
                catch (Exception releaseError)
                {
                    _logger.LogError(releaseError, "Failed to release local AI quota after provider rejection.");
                }
            }

            await FailOrRetryAsync(
                claimed,
                ex,
                cancellationToken,
                providerConfigurationFailure &&
                !HasEdenFallbackConfigured(claimed.JobType));
        }
    }

    private async Task FailOrRetryAsync(
        AiGenerationJob claimed,
        Exception exception,
        CancellationToken cancellationToken,
        bool nonRetryableProviderFailure)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var job = await db.AiGenerationJobs
            .SingleOrDefaultAsync(x => x.Id == claimed.Id, cancellationToken);

        if (job is null)
            return;

        job.LastError = exception.Message.Length > 2000
            ? exception.Message[..2000]
            : exception.Message;

        job.LockedUntil = null;
        job.UpdatedAt = DateTime.UtcNow;
        job.CompletedAt = null;

        if (nonRetryableProviderFailure)
        {
            job.Status = AiGenerationJobStatus.Failed;
            job.NextAttemptAt = null;

            // Do not keep hammering a provider that has rejected the request.
            // Leave pending jobs paused until the admin explicitly resumes them
            // after fixing quota, permissions, provider, or model configuration.
            var resumeAt = DateTime.UtcNow.AddDays(3650);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "AiGenerationJobs"
                SET "NextAttemptAt" = {resumeAt},
                    "UpdatedAt" = NOW()
                WHERE "Status" = 0
                  AND "JobType" = {(int)job.JobType};
                """, cancellationToken);
        }
        else if (job.Attempts >= _configuration.GetValue("AI_MAX_ATTEMPTS", 3))
        {
            job.Status = AiGenerationJobStatus.Failed;
            job.NextAttemptAt = null;
        }
        else
        {
            job.Status = AiGenerationJobStatus.Pending;
            job.NextAttemptAt =
                DateTime.UtcNow.AddSeconds(
                    AiGenerationJobService.BackoffSeconds(job.Attempts));
        }

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogWarning(
            exception,
            "AI generation failed. Job {JobId}, Question {QuestionId}, Type {JobType}, attempt {Attempt}, status {Status}, nextAttemptAt {NextAttemptAt}.",
            job.Id,
            job.QuestionId,
            job.JobType,
            job.Attempts,
            job.Status,
            job.NextAttemptAt);
    }

    private bool HasEdenFallbackConfigured(AiGenerationJobType jobType)
    {
        var key = jobType == AiGenerationJobType.Audio
            ? _configuration["EDENAI_AUDIO_PROVIDER"]
            : _configuration["EDENAI_IMAGE_PROVIDER"];

        return !string.IsNullOrWhiteSpace(_configuration["EDENAI_API_KEY"]) &&
               !string.IsNullOrWhiteSpace(key);
    }

    private static bool IsProviderConfigurationFailure(Exception exception)
    {
        var message = exception.ToString();

        // Provider/auth/request failures must not consume the local monthly
        // generation allowance because no usable image/audio was produced.
        return message.Contains("quota_exceeded", StringComparison.OrdinalIgnoreCase)
            || message.Contains("HTTP 402", StringComparison.OrdinalIgnoreCase)
            || message.Contains("depleted your monthly included credits", StringComparison.OrdinalIgnoreCase)
            || message.Contains("HTTP 400", StringComparison.OrdinalIgnoreCase)
            || message.Contains("HTTP 401", StringComparison.OrdinalIgnoreCase)
            || message.Contains("HTTP 403", StringComparison.OrdinalIgnoreCase)
            || message.Contains("HTTP 422", StringComparison.OrdinalIgnoreCase)
            || message.Contains("sufficient permissions", StringComparison.OrdinalIgnoreCase)
            || message.Contains("permission_required", StringComparison.OrdinalIgnoreCase)
            || message.Contains("لم يُرجع صورة فعلية", StringComparison.OrdinalIgnoreCase)
            || message.Contains("ليست ملف صورة صالحاً", StringComparison.OrdinalIgnoreCase)
            || message.Contains("ملف صورة فارغ", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task CompleteJobAsync(
        AppDbContext db,
        long id,
        string note,
        CancellationToken cancellationToken)
    {
        var job = await db.AiGenerationJobs
            .SingleAsync(x => x.Id == id, cancellationToken);

        job.Status = AiGenerationJobStatus.Completed;
        job.LastError = note;
        job.NextAttemptAt = null;
        job.LockedUntil = null;
        job.UpdatedAt = DateTime.UtcNow;
        job.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task ReleaseJobAsync(
        AppDbContext db,
        long id,
        string note,
        CancellationToken cancellationToken,
        DateTime? nextAttemptAt = null)
    {
        var job = await db.AiGenerationJobs
            .SingleAsync(x => x.Id == id, cancellationToken);

        job.Status = AiGenerationJobStatus.Pending;
        job.LastError = note;
        job.NextAttemptAt = nextAttemptAt ?? DateTime.UtcNow.AddMinutes(5);
        job.LockedUntil = null;
        job.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }
}