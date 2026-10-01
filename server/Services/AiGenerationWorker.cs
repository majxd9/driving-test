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

        var scanEvery = TimeSpan.FromSeconds(
            _configuration.GetValue("AI_QUEUE_SCAN_SECONDS", 30));

        var pollEvery = TimeSpan.FromSeconds(
            _configuration.GetValue("AI_QUEUE_POLL_SECONDS", 3));

        var nextScan = DateTime.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var jobs = scope.ServiceProvider.GetRequiredService<AiGenerationJobService>();

                await jobs.ResetStaleProcessingAsync(stoppingToken);

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
        var quota = new AiGenerationQuotaService(db, _configuration);

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

                if (!await quota.TryConsumeAsync(cancellationToken))
                {
                    await ReleaseJobAsync(
                        db,
                        claimed.Id,
                        "تم بلوغ الحد الشهري لتوليد AI؛ ستُستأنف المهمة تلقائياً في بداية الشهر القادم.",
                        cancellationToken,
                        quota.NextMonthStartUtc);
                    return;
                }

                var generator = scope.ServiceProvider
                    .GetRequiredService<IQuestionAudioGenerator>();

                var result = await generator.GenerateAsync(
                    question,
                    cancellationToken);

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

                if (!await quota.TryConsumeAsync(cancellationToken))
                {
                    await ReleaseJobAsync(
                        db,
                        claimed.Id,
                        "تم بلوغ الحد الشهري لتوليد AI؛ ستُستأنف المهمة تلقائياً في بداية الشهر القادم.",
                        quota.NextMonthStartUtc,
                        cancellationToken);
                    return;
                }

                var generator = scope.ServiceProvider
                    .GetRequiredService<IQuestionImageGenerator>();

                var result = await generator.GenerateAsync(
                    question,
                    cancellationToken);

                var image = await db.QuestionAiImages
                    .SingleOrDefaultAsync(
                        x => x.QuestionId == question.Id,
                        cancellationToken);

                if (image is null)
                {
                    db.QuestionAiImages.Add(new QuestionAiImage
                    {
                        QuestionId = question.Id,
                        ImageBytes = result.Bytes,
                        ContentHash = claimed.ContentHash,
                        ContentType = result.ContentType,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    image.ImageBytes = result.Bytes;
                    image.ContentHash = claimed.ContentHash;
                    image.ContentType = result.ContentType;
                    image.CreatedAt = DateTime.UtcNow;
                }
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
            await FailOrRetryAsync(claimed, ex, cancellationToken);
        }
    }

    private async Task FailOrRetryAsync(
        AiGenerationJob claimed,
        Exception exception,
        CancellationToken cancellationToken)
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

        if (job.Attempts >= _configuration.GetValue("AI_MAX_ATTEMPTS", 3))
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
            "AI generation failed. Job {JobId}, attempt {Attempt}.",
            job.Id,
            job.Attempts);
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