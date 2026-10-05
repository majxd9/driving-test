using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public sealed record AiGenerationCounts(
    int Missing,
    int Pending,
    int Processing,
    int Completed,
    int Failed,
    string? LastError = null,
    DateTime? LastErrorAt = null)
{
    public int Remaining => Missing + Pending + Processing;
}

public sealed record AiGenerationOverview(
    string AudioProvider,
    string ImageProvider,
    string ImageExecutionProvider,
    string AudioFallbackProvider,
    string ImageFallbackProvider,
    AiGenerationCounts Audio,
    AiGenerationCounts Image,
    AiGenerationQuota Quota);

public sealed record AiGenerationControlState(bool AudioEnabled, bool ImageEnabled, string ImageProvider)
{
    public bool AllEnabled => AudioEnabled && ImageEnabled;
    public bool AllDisabled => !AudioEnabled && !ImageEnabled;
}

public sealed record AiGenerationEnqueueResult(
    int Created,
    int Requeued,
    int Skipped,
    int FailedRetried);

public sealed record CompletedAiImageItem(
    int QuestionId,
    string QuestionText,
    string Category,
    string ImageUrl,
    string ContentHash,
    DateTime CreatedAt);

public sealed record AiImageReviewItem(
    int QuestionId,
    string QuestionText,
    string Category,
    string ImageUrl,
    string ContentHash,
    DateTime CreatedAt,
    int PendingCount,
    int ReviewedCount,
    string Prompt,
    string NegativePrompt);

public sealed class AiGenerationJobService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    private readonly record struct StoredMediaState(
        int QuestionId,
        string ContentHash,
        bool HasBytes,
        DateTime CreatedAt);

    public AiGenerationJobService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public string AudioProvider =>
        (_configuration["QUESTION_AUDIO_PROVIDER"] ?? "fish").Trim().ToLowerInvariant();

    public string AudioFallbackProvider =>
        HasEdenFallback("EDENAI_AUDIO_PROVIDER")
            ? (_configuration["EDENAI_AUDIO_PROVIDER"] ?? string.Empty).Trim().ToLowerInvariant()
            : string.Empty;

    public string ImageFallbackProvider =>
        HasEdenFallback("EDENAI_IMAGE_PROVIDER")
            ? (_configuration["EDENAI_IMAGE_PROVIDER"] ?? string.Empty).Trim().ToLowerInvariant()
            : string.Empty;

    public async Task EnsureControlStorageAsync(CancellationToken cancellationToken = default)
    {
        await _db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "AiGenerationControl" (
                "Id" integer PRIMARY KEY,
                "AudioEnabled" boolean NOT NULL,
                "ImageEnabled" boolean NOT NULL,
                "ImageProvider" text,
                "UpdatedAt" timestamp with time zone NOT NULL
            );

            ALTER TABLE "AiGenerationControl"
                ADD COLUMN IF NOT EXISTS "ImageProvider" text;
            """, cancellationToken);

        var configuredProvider = "gemini";

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "AiGenerationControl" ("Id", "AudioEnabled", "ImageEnabled", "ImageProvider", "UpdatedAt")
            VALUES (1, false, false, 'gemini', NOW())
            ON CONFLICT ("Id") DO NOTHING;
            """, cancellationToken);

        // One-time migration for the existing control row: start in a safe,
        // provider-isolated state using Gemini, but do not start image generation.
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AiGenerationControl"
            SET "ImageProvider" = {configuredProvider},
                "ImageEnabled" = FALSE,
                "UpdatedAt" = NOW()
            WHERE "Id" = 1
              AND NULLIF(TRIM("ImageProvider"), '') IS NULL;
            """, cancellationToken);
    }

    public async Task<AiGenerationControlState> GetControlStateAsync(CancellationToken cancellationToken = default)
    {
        await EnsureControlStorageAsync(cancellationToken);

        var row = await _db.Database
            .SqlQueryRaw<AiGenerationControlRow>("""
                SELECT
                    "AudioEnabled" AS "AudioEnabled",
                    "ImageEnabled" AS "ImageEnabled",
                    "ImageProvider" AS "ImageProvider"
                FROM "AiGenerationControl"
                WHERE "Id" = 1
            """)
            .SingleAsync(cancellationToken);

        return new AiGenerationControlState(
            row.AudioEnabled,
            row.ImageEnabled,
            NormalizeImageProvider(row.ImageProvider ?? "none"));
    }

    public async Task<AiGenerationControlState> SetControlStateAsync(
        bool? audioEnabled,
        bool? imageEnabled,
        CancellationToken cancellationToken = default)
    {
        await EnsureControlStorageAsync(cancellationToken);

        var current = await GetControlStateAsync(cancellationToken);
        var audio = audioEnabled ?? current.AudioEnabled;
        var image = imageEnabled ?? current.ImageEnabled;

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AiGenerationControl"
            SET "AudioEnabled" = {audio},
                "ImageEnabled" = {image},
                "UpdatedAt" = NOW()
            WHERE "Id" = 1;
            """, cancellationToken);

        if (!audio)
        {
            await PausePendingJobsAsync(AiGenerationJobType.Audio, cancellationToken);
        }

        if (!image)
        {
            await PausePendingJobsAsync(AiGenerationJobType.AiImage, cancellationToken);
        }

        return new AiGenerationControlState(audio, image, current.ImageProvider);
    }

    public async Task<AiGenerationControlState> SetImageProviderAsync(
        string provider,
        CancellationToken cancellationToken = default)
    {
        var selected = NormalizeImageProvider(provider);

        await EnsureControlStorageAsync(cancellationToken);
        await PausePendingJobsAsync(AiGenerationJobType.AiImage, cancellationToken);

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AiGenerationControl"
            SET "ImageProvider" = {selected},
                "ImageEnabled" = FALSE,
                "UpdatedAt" = NOW()
            WHERE "Id" = 1;
            """, cancellationToken);

        var current = await GetControlStateAsync(cancellationToken);
        return current;
    }

    public static string NormalizeImageProvider(string value)
    {
        var provider = value.Trim().ToLowerInvariant();
        return provider is "none" or "gemini" or "huggingface" or "edenai" or "comfyui"
            ? provider
            : throw new ArgumentException("مزود الصور يجب أن يكون none أو gemini أو huggingface أو edenai أو comfyui.");
    }

    public static string ResolveImageExecutionProvider(string selectedProvider, IConfiguration configuration)
    {
        var provider = NormalizeImageProvider(selectedProvider);
        if (!string.Equals(provider, "huggingface", StringComparison.OrdinalIgnoreCase))
            return provider;

        return HuggingFaceQuestionImageGenerator
            .ResolveConfiguration(configuration)
            .Provider;
    }

    public async Task PausePendingJobsAsync(
        AiGenerationJobType? type,
        CancellationToken cancellationToken = default)
    {
        if (type is null)
        {
            await _db.Database.ExecuteSqlRawAsync("""
                UPDATE "AiGenerationJobs"
                SET "NextAttemptAt" = NOW() + INTERVAL '3650 days',
                    "LockedUntil" = NULL,
                    "UpdatedAt" = NOW()
                WHERE "Status" = 0;
                """, cancellationToken);
            return;
        }

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AiGenerationJobs"
            SET "NextAttemptAt" = NOW() + INTERVAL '3650 days',
                "LockedUntil" = NULL,
                "UpdatedAt" = NOW()
            WHERE "Status" = 0
              AND "JobType" = {(int)type.Value};
            """, cancellationToken);
    }

    public async Task ResumePendingTypeAsync(
        AiGenerationJobType type,
        CancellationToken cancellationToken = default)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AiGenerationJobs"
            SET "NextAttemptAt" = NOW(),
                "LockedUntil" = NULL,
                "UpdatedAt" = NOW()
            WHERE "Status" = 0
              AND "JobType" = {(int)type};
            """, cancellationToken);
    }

    private sealed class AiGenerationControlRow
    {
        public bool AudioEnabled { get; set; }
        public bool ImageEnabled { get; set; }
        public string? ImageProvider { get; set; }
    }

    public async Task EnsureQuestionJobsAsync(
        Question question,
        bool force = false,
        CancellationToken cancellationToken = default,
        bool saveChanges = true)
    {
        await EnsureJobAsync(
            question,
            AiGenerationJobType.Audio,
            force,
            false,
            cancellationToken);

        if (QuestionImagePromptBuilder.ShouldGenerate(question))
        {
            await EnsureJobAsync(
                question,
                AiGenerationJobType.AiImage,
                force,
                false,
                cancellationToken);
        }

        if (saveChanges)
            await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task CleanupInvalidImageGenerationStateAsync(CancellationToken cancellationToken)
    {
        // Remove only queued AI-image jobs for questions that have an authoritative
        // original image/diagram. Never delete already generated AI media here.
        await _db.Database.ExecuteSqlRawAsync("""
            DELETE FROM "AiGenerationJobs"
            WHERE "JobType" = 1
              AND "QuestionId" IN (
                    SELECT "Id"
                    FROM "Questions"
                    WHERE NULLIF(TRIM(COALESCE("ImageUrl", '')), '') IS NOT NULL
                       OR "DiagramType" IS NOT NULL
                       OR NULLIF(TRIM(COALESCE("DiagramUrl", '')), '') IS NOT NULL
                  );
            """, cancellationToken);
    }

    public async Task EnqueueMissingAsync(CancellationToken cancellationToken)
    {
        await EnqueueBulkAsync(
            AiGenerationJobType.Audio,
            false,
            false,
            cancellationToken);

        await EnqueueBulkAsync(
            AiGenerationJobType.AiImage,
            false,
            false,
            cancellationToken);
    }

    public async Task<AiGenerationEnqueueResult> EnqueueBulkAsync(
        AiGenerationJobType jobType,
        bool retryFailed,
        bool forceCompleted,
        CancellationToken cancellationToken)
    {
        var questions = await _db.Questions
            .AsNoTracking()
            .OrderBy(q => q.Id)
            .ToListAsync(cancellationToken);

        var hashes = questions.ToDictionary(
            q => q.Id,
            q => jobType == AiGenerationJobType.Audio
                ? QuestionAudioTextBuilder.GetCurrentHash(q)
                : QuestionImagePromptBuilder.GetContentHash(q));

        var questionIds = questions.Select(q => q.Id).ToArray();

        var existingJobs = await _db.AiGenerationJobs
            .Where(x => questionIds.Contains(x.QuestionId) && x.JobType == jobType)
            .ToListAsync(cancellationToken);

        var jobsByKey = existingJobs.ToDictionary(
            x => $"{x.QuestionId}:{x.ContentHash}",
            x => x,
            StringComparer.Ordinal);

        var audioByQuestion = jobType == AiGenerationJobType.Audio
            ? await _db.QuestionAudios
                .AsNoTracking()
                .Where(x => questionIds.Contains(x.QuestionId) && x.AudioBytes.Length > 0)
                .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
                .ToDictionaryAsync(x => x.QuestionId, cancellationToken)
            : new Dictionary<int, StoredMediaState>();

        var imageByQuestion = jobType == AiGenerationJobType.AiImage
            ? await _db.QuestionAiImages
                .AsNoTracking()
                .Where(x => questionIds.Contains(x.QuestionId) && x.ImageBytes.Length > 0)
                .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
                .ToDictionaryAsync(x => x.QuestionId, cancellationToken)
            : new Dictionary<int, StoredMediaState>();

        var created = 0;
        var requeued = 0;
        var skipped = 0;
        var failedRetried = 0;

        foreach (var question in questions)
        {
            if (jobType == AiGenerationJobType.AiImage &&
                !QuestionImagePromptBuilder.ShouldGenerate(question))
            {
                skipped++;
                continue;
            }

            var hash = hashes[question.Id];
            var key = $"{question.Id}:{hash}";

            if (jobsByKey.TryGetValue(key, out var existing))
            {
                if (forceCompleted ||
                    (retryFailed && existing.Status == AiGenerationJobStatus.Failed))
                {
                    existing.Status = AiGenerationJobStatus.Pending;
                    existing.Attempts = 0;
                    existing.LastError = null;
                    existing.NextAttemptAt = DateTime.UtcNow;
                    existing.LockedUntil = null;
                    existing.StartedAt = null;
                    existing.CompletedAt = null;
                    existing.UpdatedAt = DateTime.UtcNow;

                    if (forceCompleted) requeued++;
                    else failedRetried++;

                    continue;
                }

                skipped++;
                continue;
            }

            var mediaExists = jobType == AiGenerationJobType.Audio
                ? audioByQuestion.TryGetValue(question.Id, out var audio) &&
                  audio.HasBytes &&
                  IsMatchingAudioHash(audio.ContentHash, question)
                : imageByQuestion.TryGetValue(question.Id, out var image) &&
                  image.HasBytes &&
                  image.ContentHash == hash;

            if (mediaExists)
            {
                skipped++;
                continue;
            }

            var job = new AiGenerationJob
            {
                QuestionId = question.Id,
                JobType = jobType,
                Status = AiGenerationJobStatus.Pending,
                Attempts = 0,
                ContentHash = hash,
                Priority = jobType == AiGenerationJobType.AiImage
                    ? QuestionImagePromptBuilder.GetPriority(question)
                    : 90,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                NextAttemptAt = DateTime.UtcNow
            };

            _db.AiGenerationJobs.Add(job);
            jobsByKey[key] = job;
            created++;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new AiGenerationEnqueueResult(
            created,
            requeued,
            skipped,
            failedRetried);
    }

    // Provider changes are handled explicitly by SetImageProviderAsync.
    // The worker must not automatically migrate or resume image jobs.

    public async Task ResumePendingAsync(CancellationToken cancellationToken)
    {
        await _db.Database.ExecuteSqlRawAsync("""
            UPDATE "AiGenerationJobs"
            SET "NextAttemptAt" = NOW(),
                "LockedUntil" = NULL,
                "UpdatedAt" = NOW()
            WHERE "Status" = 0;

            UPDATE "AiGenerationJobs"
            SET "Status" = 0,
                "Attempts" = 0,
                "LastError" = NULL,
                "NextAttemptAt" = NOW(),
                "LockedUntil" = NULL,
                "StartedAt" = NULL,
                "CompletedAt" = NULL,
                "UpdatedAt" = NOW()
            WHERE "Status" = 3
              AND "JobType" = 1
              AND (
                    "LastError" ILIKE '%Model not supported by provider nscale%'
                    OR "LastError" ILIKE '%Hugging Face رفض توليد الصورة%'
                  );
            """,
            cancellationToken);
    }

    public async Task ResumeProviderPausedJobsForFallbackAsync(CancellationToken cancellationToken)
    {
        if (HasEdenFallback("EDENAI_AUDIO_PROVIDER"))
        {
            await _db.Database.ExecuteSqlRawAsync("""
                UPDATE "AiGenerationJobs"
                SET "NextAttemptAt" = NOW(),
                    "LockedUntil" = NULL,
                    "UpdatedAt" = NOW()
                WHERE "Status" = 0
                  AND "JobType" = 0
                  AND "NextAttemptAt" > NOW() + INTERVAL '1 day'
                  AND (
                        "LastError" ILIKE '%quota_exceeded%'
                        OR "LastError" ILIKE '%ElevenLabs%'
                        OR "LastError" ILIKE '%HTTP 402%'
                        OR "LastError" ILIKE '%HTTP 429%'
                  );
                """, cancellationToken);
        }

        if (HasEdenFallback("EDENAI_IMAGE_PROVIDER"))
        {
            await _db.Database.ExecuteSqlRawAsync("""
                UPDATE "AiGenerationJobs"
                SET "NextAttemptAt" = NOW(),
                    "LockedUntil" = NULL,
                    "UpdatedAt" = NOW()
                WHERE "Status" = 0
                  AND "JobType" = 1
                  AND "NextAttemptAt" > NOW() + INTERVAL '1 day'
                  AND (
                        "LastError" ILIKE '%Hugging Face%'
                        OR "LastError" ILIKE '%Fal%'
                        OR "LastError" ILIKE '%HTTP 402%'
                        OR "LastError" ILIKE '%HTTP 429%'
                        OR "LastError" ILIKE '%depleted your monthly included credits%'
                  );
                """, cancellationToken);
        }
    }

    public async Task ResetStaleProcessingAsync(CancellationToken cancellationToken)
    {
        await _db.Database.ExecuteSqlRawAsync("""
            UPDATE "AiGenerationJobs"
            SET "Status" = 0,
                "LockedUntil" = NULL,
                "StartedAt" = NULL,
                "UpdatedAt" = NOW()
            WHERE "Status" = 1
              AND ("LockedUntil" IS NULL OR "LockedUntil" < NOW());
            """,
            cancellationToken);
    }

    public async Task<bool> RetryJobAsync(long id, CancellationToken cancellationToken)
    {
        var job = await _db.AiGenerationJobs
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (job is null)
            return false;

        job.Status = AiGenerationJobStatus.Pending;
        job.Attempts = 0;
        job.LastError = null;
        job.NextAttemptAt = DateTime.UtcNow;
        job.LockedUntil = null;
        job.StartedAt = null;
        job.CompletedAt = null;
        job.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<AiGenerationOverview> GetOverviewAsync(CancellationToken cancellationToken)
    {
        var control = await GetControlStateAsync(cancellationToken);

        var questions = await _db.Questions
            .AsNoTracking()
            .OrderBy(q => q.Id)
            .ToListAsync(cancellationToken);

        var jobs = await _db.AiGenerationJobs
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var audios = await _db.QuestionAudios
            .AsNoTracking()
            .Where(x => x.AudioBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .ToDictionaryAsync(x => x.QuestionId, cancellationToken);

        var images = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => x.ImageBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .ToDictionaryAsync(x => x.QuestionId, cancellationToken);

        var quota = await new AiGenerationQuotaService(_db, _configuration)
            .GetQuotaAsync(cancellationToken);

        return new AiGenerationOverview(
            AudioProvider,
            control.ImageProvider,
            ResolveImageExecutionProvider(control.ImageProvider, _configuration),
            AudioFallbackProvider,
            ImageFallbackProvider,
            CountStatuses(
                questions,
                AiGenerationJobType.Audio,
                jobs,
                audios,
                null),
            CountStatuses(
                questions,
                AiGenerationJobType.AiImage,
                jobs,
                null,
                images),
            quota);
    }

    public async Task AttachAdminStateAsync(
        List<Question> questions,
        CancellationToken cancellationToken)
    {
        if (questions.Count == 0)
            return;

        var ids = questions.Select(q => q.Id).ToArray();

        var jobs = await _db.AiGenerationJobs
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId))
            .ToListAsync(cancellationToken);

        var audios = await _db.QuestionAudios
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.AudioBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .ToListAsync(cancellationToken);

        var images = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.ImageBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .ToListAsync(cancellationToken);

        var audioByQuestion = audios.ToDictionary(x => x.QuestionId);
        var imageByQuestion = images.ToDictionary(x => x.QuestionId);

        foreach (var question in questions)
            ApplyState(question, jobs, audioByQuestion, imageByQuestion);
    }

    public async Task AttachStudentMediaUrlsAsync(
        IEnumerable<Question> source,
        CancellationToken cancellationToken,
        bool includeUnapprovedAiImages = false)
    {
        var questions = source.ToList();
        if (questions.Count == 0)
            return;

        var ids = questions.Select(q => q.Id).ToArray();

        var audios = await _db.QuestionAudios
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.AudioBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .ToDictionaryAsync(x => x.QuestionId, cancellationToken);

        var images = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.ImageBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .ToDictionaryAsync(x => x.QuestionId, cancellationToken);

        foreach (var question in questions)
        {
            if (audios.TryGetValue(question.Id, out var audio) &&
                audio.HasBytes)
            {
                // A real stored audio file is playable regardless of which
                // historical TTS hash produced it. Hash is freshness metadata.
                question.AudioUrl =
                    $"/api/questions/{question.Id}/audio-play?v={audio.ContentHash}";
            }

            if (images.TryGetValue(question.Id, out var image) && image.HasBytes)
            {
                // أي صورة AI مخزنة تعتبر متاحة للعرض حالياً.
                // حالة المراجعة لا تحجب الصورة؛ الإدارة تستطيع إخفاء/حذف الصورة لاحقاً.
                question.AiImageUrl =
                    $"/api/questions/{question.Id}/ai-image?v={image.ContentHash}-{image.CreatedAt.Ticks}";
            }
        }
    }

    public Task<Question?> GetQuestionForDiagnosticsAsync(
        int questionId,
        CancellationToken cancellationToken = default) =>
        _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == questionId, cancellationToken);

    public async Task<AiImageReviewItem?> GetNextAiImageReviewAsync(
        CancellationToken cancellationToken)
    {
        var pendingRows = await (
            from review in _db.AiImageReviews.AsNoTracking()
            join image in _db.QuestionAiImages.AsNoTracking()
                on review.QuestionId equals image.QuestionId
            join question in _db.Questions.AsNoTracking()
                on review.QuestionId equals question.Id
            where review.Status == AiImageReviewStatus.Pending &&
                  image.ImageBytes.Length > 0
            orderby review.CreatedAt, review.QuestionId
            select new
            {
                QuestionId = question.Id,
                QuestionText = question.Text,
                Category = question.Category,
                question.ImageUrl,
                image.ContentHash,
                image.CreatedAt,
                question.Options,
                question.DiagramType,
                question.DiagramUrl,
                question.DiagramTitle,
                question.DiagramDescription
            })
            .ToListAsync(cancellationToken);

        // Never show a stale image that was generated from an older prompt/hash.
        // This is important during the v4 -> v5 migration: the old balloon (or
        // any other old result) must not appear in the review queue while the
        // replacement image is waiting to be generated.
        var row = pendingRows
            .Select(item =>
            {
                var question = new Question
                {
                    Id = item.QuestionId,
                    Text = item.QuestionText,
                    Category = item.Category,
                    Options = item.Options,
                    ImageUrl = item.ImageUrl,
                    DiagramType = item.DiagramType,
                    DiagramUrl = item.DiagramUrl,
                    DiagramTitle = item.DiagramTitle,
                    DiagramDescription = item.DiagramDescription
                };

                return new
                {
                    item.QuestionId,
                    item.QuestionText,
                    item.Category,
                    item.ContentHash,
                    item.CreatedAt,
                    CurrentHash = QuestionImagePromptBuilder.GetContentHash(question),
                    Prompt = QuestionImagePromptBuilder.Build(question).Positive,
                    NegativePrompt = QuestionImagePromptBuilder.Build(question).Negative
                };
            })
            .FirstOrDefault(item =>
                string.Equals(item.ContentHash, item.CurrentHash, StringComparison.Ordinal));

        if (row is null)
            return null;

        var counts = await _db.AiImageReviews
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var pending = counts.FirstOrDefault(x => x.Status == AiImageReviewStatus.Pending)?.Count ?? 0;
        var reviewed = counts
            .Where(x => x.Status != AiImageReviewStatus.Pending)
            .Sum(x => x.Count);

        return new AiImageReviewItem(
            row.QuestionId,
            row.QuestionText,
            row.Category.ToString(),
            $"/api/admin/ai-generation/review-image/{row.QuestionId}?v={row.ContentHash}-{row.CreatedAt.Ticks}",
            row.ContentHash,
            row.CreatedAt,
            pending,
            reviewed,
            row.Prompt,
            row.NegativePrompt);
    }

    public async Task<QuestionAiImage?> GetReviewImageAsync(
        int questionId,
        CancellationToken cancellationToken)
    {
        return await _db.QuestionAiImages
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.QuestionId == questionId && x.ImageBytes.Length > 0,
                cancellationToken);
    }

    public async Task<bool> HideAiImageAsync(int questionId, CancellationToken cancellationToken)
    {
        var image = await _db.QuestionAiImages.SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);
        if (image is null || image.ImageBytes.Length == 0)
            return false;

        var review = await _db.AiImageReviews.SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);
        if (review is null)
        {
            review = new AiImageReview
            {
                QuestionId = questionId,
                ContentHash = image.ContentHash,
                CreatedAt = image.CreatedAt
            };
            _db.AiImageReviews.Add(review);
        }

        review.ContentHash = image.ContentHash;
        review.Status = AiImageReviewStatus.Hidden;
        review.ReviewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAiImageAsync(int questionId, CancellationToken cancellationToken)
    {
        var image = await _db.QuestionAiImages.SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);
        if (image is null)
            return false;

        _db.QuestionAiImages.Remove(image);

        var review = await _db.AiImageReviews.SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);
        if (review is not null)
            _db.AiImageReviews.Remove(review);

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<AiImageReviewItem?> ReviewAiImageAsync(
        int questionId,
        bool approve,
        CancellationToken cancellationToken)
    {
        var question = await _db.Questions
            .SingleOrDefaultAsync(x => x.Id == questionId, cancellationToken);

        var image = await _db.QuestionAiImages
            .SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);

        if (question is null || image is null || image.ImageBytes.Length == 0)
            return await GetNextAiImageReviewAsync(cancellationToken);

        var currentHash = QuestionImagePromptBuilder.GetContentHash(question);

        var review = await _db.AiImageReviews
            .SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);

        if (review is null)
        {
            review = new AiImageReview
            {
                QuestionId = questionId,
                ContentHash = image.ContentHash,
                CreatedAt = image.CreatedAt
            };
            _db.AiImageReviews.Add(review);
        }

        if (approve && !string.Equals(image.ContentHash, currentHash, StringComparison.Ordinal))
            approve = false;

        review.ContentHash = image.ContentHash;
        review.ReviewedAt = DateTime.UtcNow;

        if (approve)
        {
            review.Status = AiImageReviewStatus.Approved;
        }
        else
        {
            review.Status = AiImageReviewStatus.Rejected;
            image.ImageBytes = Array.Empty<byte>();
            image.ContentType = "image/png";
            image.ContentHash = currentHash;
            image.CreatedAt = DateTime.UtcNow;

            var job = await _db.AiGenerationJobs
                .SingleOrDefaultAsync(x =>
                    x.QuestionId == questionId &&
                    x.JobType == AiGenerationJobType.AiImage &&
                    x.ContentHash == currentHash,
                    cancellationToken);

            if (job is null)
            {
                _db.AiGenerationJobs.Add(new AiGenerationJob
                {
                    QuestionId = questionId,
                    JobType = AiGenerationJobType.AiImage,
                    Status = AiGenerationJobStatus.Pending,
                    Attempts = 0,
                    ContentHash = currentHash,
                    Priority = QuestionImagePromptBuilder.GetPriority(question),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    NextAttemptAt = DateTime.UtcNow
                });
            }
            else
            {
                job.Status = AiGenerationJobStatus.Pending;
                job.Attempts = 0;
                job.LastError = null;
                job.NextAttemptAt = DateTime.UtcNow;
                job.LockedUntil = null;
                job.StartedAt = null;
                job.CompletedAt = null;
                job.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        return await GetNextAiImageReviewAsync(cancellationToken);
    }

    public async Task MarkImagePendingReviewAsync(
        int questionId,
        string contentHash,
        DateTime createdAt,
        CancellationToken cancellationToken)
    {
        var review = await _db.AiImageReviews
            .SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);

        if (review is null)
        {
            _db.AiImageReviews.Add(new AiImageReview
            {
                QuestionId = questionId,
                ContentHash = contentHash,
                Status = AiImageReviewStatus.Pending,
                CreatedAt = createdAt,
                ReviewedAt = null
            });
            return;
        }

        review.ContentHash = contentHash;
        review.Status = AiImageReviewStatus.Pending;
        review.CreatedAt = createdAt;
        review.ReviewedAt = null;
    }

    public async Task<IReadOnlyList<CompletedAiImageItem>> GetCompletedAiImagesAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var safeLimit = Math.Clamp(limit, 1, 60);

        var items = await (
            from image in _db.QuestionAiImages.AsNoTracking()
            join review in _db.AiImageReviews.AsNoTracking()
                on image.QuestionId equals review.QuestionId
            join question in _db.Questions.AsNoTracking()
                on image.QuestionId equals question.Id
            where image.ImageBytes.Length > 0 &&
                  review.Status == AiImageReviewStatus.Approved
            select new
            {
                QuestionId = question.Id,
                QuestionText = question.Text,
                Category = question.Category,
                image.ContentHash,
                image.CreatedAt,
                question.ImageUrl,
                question.Options,
                question.DiagramType,
                question.DiagramUrl,
                question.DiagramTitle,
                question.DiagramDescription
            })
            .ToListAsync(cancellationToken);

        return items
            .Where(item =>
            {
                var question = new Question
                {
                    Id = item.QuestionId,
                    Text = item.QuestionText,
                    Category = item.Category,
                    ImageUrl = item.ImageUrl,
                    Options = item.Options,
                    DiagramType = item.DiagramType,
                    DiagramUrl = item.DiagramUrl,
                    DiagramTitle = item.DiagramTitle,
                    DiagramDescription = item.DiagramDescription
                };
                return item.ContentHash == QuestionImagePromptBuilder.GetContentHash(question);
            })
            .OrderByDescending(item => item.CreatedAt)
            .Take(safeLimit)
            .Select(item => new CompletedAiImageItem(
                item.QuestionId,
                item.QuestionText,
                item.Category.ToString(),
                $"/api/questions/{item.QuestionId}/ai-image?v={item.ContentHash}-{item.CreatedAt.Ticks}",
                item.ContentHash,
                item.CreatedAt))
            .ToList();
    }

    public async Task<AiGenerationJob?> ClaimNextJobAsync(
        CancellationToken cancellationToken)
    {
        var control = await GetControlStateAsync(cancellationToken);

        if (control.AllDisabled)
            return null;

        var sql = """
              SELECT * FROM "AiGenerationJobs"
              WHERE "Status" = 0
                AND ("NextAttemptAt" IS NULL OR "NextAttemptAt" <= NOW())
                AND (
                    ("JobType" = 0 AND {0})
                    OR
                    ("JobType" = 1 AND {1} AND {2})
                )
              ORDER BY "Priority" DESC, "CreatedAt" ASC
              FOR UPDATE SKIP LOCKED
              LIMIT 1
              """;
        sql = string.Format(
            System.Globalization.CultureInfo.InvariantCulture,
            sql,
            control.AudioEnabled ? "TRUE" : "FALSE",
            control.ImageEnabled ? "TRUE" : "FALSE",
            (!string.Equals(control.ImageProvider, "none", StringComparison.OrdinalIgnoreCase) ? "TRUE" : "FALSE"));

        await using var transaction =
            await _db.Database.BeginTransactionAsync(cancellationToken);

        var job = await _db.AiGenerationJobs
            .FromSqlRaw(sql)
            .AsTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (job is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var now = DateTime.UtcNow;

        job.Status = AiGenerationJobStatus.Processing;
        job.Attempts++;
        job.UpdatedAt = now;
        job.StartedAt = now;
        var lockMinutes = Math.Clamp(
            _configuration.GetValue("AI_JOB_LOCK_MINUTES", 60),
            5,
            240);

        job.LockedUntil = now.AddMinutes(lockMinutes);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return job;
    }

    public static int BackoffSeconds(int attempts) =>
        attempts switch
        {
            1 => 30,
            2 => 120,
            _ => 600
        };

    private async Task<EnsureResult> EnsureJobAsync(
        Question question,
        AiGenerationJobType type,
        bool force,
        bool retryFailed,
        CancellationToken cancellationToken)
    {
        var hash = type == AiGenerationJobType.Audio
            ? QuestionAudioTextBuilder.GetCurrentHash(question)
            : QuestionImagePromptBuilder.GetContentHash(question);

        var existing = await _db.AiGenerationJobs
            .SingleOrDefaultAsync(
                x => x.QuestionId == question.Id &&
                     x.JobType == type &&
                     x.ContentHash == hash,
                cancellationToken);

        var mediaExists = type == AiGenerationJobType.Audio
            ? await HasMatchingAudioAsync(question, cancellationToken)
            : await HasMatchingImageAsync(question, cancellationToken);

        if (existing is not null)
        {
            if (force ||
                (retryFailed && existing.Status == AiGenerationJobStatus.Failed))
            {
                existing.Status = AiGenerationJobStatus.Pending;
                existing.Attempts = 0;
                existing.LastError = null;
                existing.NextAttemptAt = DateTime.UtcNow;
                existing.LockedUntil = null;
                existing.StartedAt = null;
                existing.CompletedAt = null;
                existing.UpdatedAt = DateTime.UtcNow;

                return force
                    ? EnsureResult.Requeued
                    : EnsureResult.FailedRetried;
            }

            return EnsureResult.Skipped;
        }

        if (!force && mediaExists)
            return EnsureResult.Skipped;

        _db.AiGenerationJobs.Add(new AiGenerationJob
        {
            QuestionId = question.Id,
            JobType = type,
            Status = AiGenerationJobStatus.Pending,
            Attempts = 0,
            ContentHash = hash,
            Priority = type == AiGenerationJobType.AiImage
                ? QuestionImagePromptBuilder.GetPriority(question)
                : 90,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            NextAttemptAt = DateTime.UtcNow
        });

        return EnsureResult.Created;
    }

    private async Task<bool> HasMatchingAudioAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var audio = await _db.QuestionAudios
            .AsNoTracking()
            .Where(x => x.QuestionId == question.Id && x.AudioBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return audio.HasBytes;
    }

    private async Task<bool> HasMatchingImageAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var image = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => x.QuestionId == question.Id && x.ImageBytes.Length > 0)
            .Select(x => new StoredMediaState(x.QuestionId, x.ContentHash, true, x.CreatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return image.HasBytes &&
               image.ContentHash == QuestionImagePromptBuilder.GetContentHash(question);
    }

    private void ApplyState(
        Question question,
        IReadOnlyList<AiGenerationJob> jobs,
        IReadOnlyDictionary<int, StoredMediaState> audios,
        IReadOnlyDictionary<int, StoredMediaState> images)
    {
        var audioHash = QuestionAudioTextBuilder.GetCurrentHash(question);
        var audioReady = audios.TryGetValue(question.Id, out var audio) &&
                         audio.HasBytes;

        question.AudioUrl = audioReady
            ? $"/api/questions/{question.Id}/audio-play?v={audio.ContentHash}"
            : null;

        question.AudioGenerationStatus = ResolveStatus(
            audioReady,
            jobs.Where(x =>
                x.QuestionId == question.Id &&
                x.JobType == AiGenerationJobType.Audio &&
                x.ContentHash == audioHash));

        if (QuestionImagePromptBuilder.ShouldGenerate(question))
        {
            var imageHash = QuestionImagePromptBuilder.GetContentHash(question);
            var imageReady = images.TryGetValue(question.Id, out var image) &&
                             image.HasBytes &&
                             image.ContentHash == imageHash;

            question.AiImageUrl = imageReady
                ? $"/api/questions/{question.Id}/ai-image?v={imageHash}-{image.CreatedAt.Ticks}"
                : null;

            question.AiImageGenerationStatus = ResolveStatus(
                imageReady,
                jobs.Where(x =>
                    x.QuestionId == question.Id &&
                    x.JobType == AiGenerationJobType.AiImage &&
                    x.ContentHash == imageHash));
        }
        else
        {
            question.AiImageUrl = null;
            question.AiImageGenerationStatus = "NotRequired";
        }
    }

    private static string ResolveStatus(
        bool completed,
        IEnumerable<AiGenerationJob> jobs)
    {
        if (completed)
            return nameof(AiGenerationJobStatus.Completed);

        var job = jobs
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

        return job is null ? "Missing" : job.Status.ToString();
    }

    private static bool IsMatchingAudioHash(string contentHash, Question question)
    {
        return contentHash == QuestionAudioTextBuilder.GetCurrentHash(question) ||
               contentHash == QuestionAudioTextBuilder.GetLegacyHash(question) ||
               contentHash == QuestionAudioTextBuilder.GetPreviousAdminHash(question);
    }

    private static AiGenerationCounts CountStatuses(
        IReadOnlyList<Question> questions,
        AiGenerationJobType type,
        IReadOnlyList<AiGenerationJob> jobs,
        IReadOnlyDictionary<int, StoredMediaState>? audios,
        IReadOnlyDictionary<int, StoredMediaState>? images)
    {
        var missing = 0;
        var pending = 0;
        var processing = 0;
        var completed = 0;
        var failed = 0;

        foreach (var question in questions)
        {
            if (type == AiGenerationJobType.AiImage &&
                !QuestionImagePromptBuilder.ShouldGenerate(question))
                continue;

            var hash = type == AiGenerationJobType.Audio
                ? QuestionAudioTextBuilder.GetCurrentHash(question)
                : QuestionImagePromptBuilder.GetContentHash(question);

            var isCompleted = false;

            if (type == AiGenerationJobType.Audio &&
                audios is not null &&
                audios.TryGetValue(question.Id, out var audio))
            {
                isCompleted = audio.HasBytes;
            }
            else if (type == AiGenerationJobType.AiImage &&
                     images is not null &&
                     images.TryGetValue(question.Id, out var image))
            {
                isCompleted =
                    image.HasBytes &&
                    image.ContentHash == hash;
            }

            if (isCompleted)
            {
                completed++;
                continue;
            }

            var job = jobs
                .Where(x =>
                    x.QuestionId == question.Id &&
                    x.JobType == type &&
                    x.ContentHash == hash)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefault();

            switch (job?.Status)
            {
                case AiGenerationJobStatus.Pending:
                    pending++;
                    break;
                case AiGenerationJobStatus.Processing:
                    processing++;
                    break;
                case AiGenerationJobStatus.Completed:
                    // The job claims completion but the matching media is absent.
                    // Treat it as missing so the admin can enqueue it again.
                    missing++;
                    break;
                case AiGenerationJobStatus.Failed:
                    failed++;
                    break;
                default:
                    missing++;
                    break;
            }
        }

        var lastErrorJob = jobs
            .Where(x =>
                x.JobType == type &&
                x.Status == AiGenerationJobStatus.Failed &&
                !string.IsNullOrWhiteSpace(x.LastError))
            .OrderByDescending(x => x.UpdatedAt)
            .FirstOrDefault();

        return new AiGenerationCounts(
            missing,
            pending,
            processing,
            completed,
            failed,
            lastErrorJob?.LastError,
            lastErrorJob?.UpdatedAt);
    }

    private bool HasEdenFallback(string providerKey)
    {
        return !string.IsNullOrWhiteSpace(_configuration["EDENAI_API_KEY"]) &&
               !string.IsNullOrWhiteSpace(_configuration[providerKey]);
    }

    private enum EnsureResult
    {
        Created,
        Requeued,
        FailedRetried,
        Skipped
    }
}