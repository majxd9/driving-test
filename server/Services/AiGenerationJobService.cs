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
    string? LastError = null)
{
    public int Remaining => Missing + Pending + Processing;
}

public sealed record AiGenerationOverview(
    string AudioProvider,
    string ImageProvider,
    AiGenerationCounts Audio,
    AiGenerationCounts Image,
    AiGenerationQuota Quota);

public sealed record AiGenerationEnqueueResult(
    int Created,
    int Requeued,
    int Skipped,
    int FailedRetried);

public sealed class AiGenerationJobService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public AiGenerationJobService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public string AudioProvider =>
        (_configuration["QUESTION_AUDIO_PROVIDER"] ?? "elevenlabs").Trim().ToLowerInvariant();

    public string ImageProvider =>
        (_configuration["QUESTION_IMAGE_PROVIDER"] ?? "none").Trim().ToLowerInvariant();

    public bool IsImageProviderEnabled =>
        ImageProvider != "none" && !string.IsNullOrWhiteSpace(ImageProvider);

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
                .ToDictionaryAsync(x => x.QuestionId, cancellationToken)
            : new Dictionary<int, QuestionAudio>();

        var imageByQuestion = jobType == AiGenerationJobType.AiImage
            ? await _db.QuestionAiImages
                .AsNoTracking()
                .Where(x => questionIds.Contains(x.QuestionId) && x.ImageBytes.Length > 0)
                .ToDictionaryAsync(x => x.QuestionId, cancellationToken)
            : new Dictionary<int, QuestionAiImage>();

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
                  (audio.ContentHash == hash ||
                   (audio.ContentHash == QuestionAudioTextBuilder.GetLegacyHash(question) ||
                   audio.ContentHash == QuestionAudioTextBuilder.GetPreviousAdminHash(question)))
                : imageByQuestion.TryGetValue(question.Id, out var image) &&
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
            .ToDictionaryAsync(x => x.QuestionId, cancellationToken);

        var images = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => x.ImageBytes.Length > 0)
            .ToDictionaryAsync(x => x.QuestionId, cancellationToken);

        var quota = await new AiGenerationQuotaService(_db, _configuration)
            .GetQuotaAsync(cancellationToken);

        return new AiGenerationOverview(
            AudioProvider,
            ImageProvider,
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
            .ToListAsync(cancellationToken);

        var images = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.ImageBytes.Length > 0)
            .ToListAsync(cancellationToken);

        foreach (var question in questions)
            ApplyState(question, jobs, audios, images);
    }

    public async Task AttachStudentMediaUrlsAsync(
        IEnumerable<Question> source,
        CancellationToken cancellationToken)
    {
        var questions = source.ToList();
        if (questions.Count == 0)
            return;

        var ids = questions.Select(q => q.Id).ToArray();

        var audios = await _db.QuestionAudios
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.AudioBytes.Length > 0)
            .ToListAsync(cancellationToken);

        var images = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.ImageBytes.Length > 0)
            .ToListAsync(cancellationToken);

        foreach (var question in questions)
        {
            var audio = audios.FirstOrDefault(x => x.QuestionId == question.Id);
            if (audio is not null &&
                IsMatchingAudioHash(audio.ContentHash, question))
            {
                question.AudioUrl =
                    $"/api/questions/{question.Id}/audio-play?v={audio.ContentHash}";
            }

            var image = images.FirstOrDefault(x => x.QuestionId == question.Id);
            var imageHash = QuestionImagePromptBuilder.GetContentHash(question);

            if (image is not null && image.ContentHash == imageHash)
            {
                question.AiImageUrl =
                    $"/api/questions/{question.Id}/ai-image?v={imageHash}";
            }
        }
    }

    public async Task<AiGenerationJob?> ClaimNextJobAsync(
        CancellationToken cancellationToken)
    {
        var sql = IsImageProviderEnabled
            ? """
              SELECT * FROM "AiGenerationJobs"
              WHERE "Status" = 0
                AND ("NextAttemptAt" IS NULL OR "NextAttemptAt" <= NOW())
              ORDER BY "Priority" DESC, "CreatedAt" ASC
              FOR UPDATE SKIP LOCKED
              LIMIT 1
              """
            : """
              SELECT * FROM "AiGenerationJobs"
              WHERE "Status" = 0
                AND "JobType" = 0
                AND ("NextAttemptAt" IS NULL OR "NextAttemptAt" <= NOW())
              ORDER BY "Priority" DESC, "CreatedAt" ASC
              FOR UPDATE SKIP LOCKED
              LIMIT 1
              """;

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
        job.LockedUntil =
            now.AddMinutes(_configuration.GetValue("AI_JOB_LOCK_MINUTES", 60));

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
            .SingleOrDefaultAsync(
                x => x.QuestionId == question.Id,
                cancellationToken);

        return audio is not null &&
               audio.AudioBytes.Length > 0 &&
               IsMatchingAudioHash(audio.ContentHash, question);
    }

    private async Task<bool> HasMatchingImageAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var image = await _db.QuestionAiImages
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.QuestionId == question.Id,
                cancellationToken);

        return image is not null &&
               image.ImageBytes.Length > 0 &&
               image.ContentHash == QuestionImagePromptBuilder.GetContentHash(question);
    }

    private void ApplyState(
        Question question,
        IReadOnlyList<AiGenerationJob> jobs,
        IReadOnlyList<QuestionAudio> audios,
        IReadOnlyList<QuestionAiImage> images)
    {
        var audioHash = QuestionAudioTextBuilder.GetCurrentHash(question);
        var audio = audios.FirstOrDefault(x => x.QuestionId == question.Id);
        var audioReady = audio is not null &&
                         IsMatchingAudioHash(audio.ContentHash, question);

        question.AudioUrl = audioReady
            ? $"/api/questions/{question.Id}/audio-play?v={audio!.ContentHash}"
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
            var image = images.FirstOrDefault(x => x.QuestionId == question.Id);
            var imageReady = image is not null && image.ContentHash == imageHash;

            question.AiImageUrl = imageReady
                ? $"/api/questions/{question.Id}/ai-image?v={imageHash}"
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
        IReadOnlyDictionary<int, QuestionAudio>? audios,
        IReadOnlyDictionary<int, QuestionAiImage>? images)
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
                isCompleted =
                    audio.AudioBytes.Length > 0 &&
                    (audio.ContentHash == hash ||
                     audio.ContentHash == QuestionAudioTextBuilder.GetLegacyHash(question));
            }
            else if (type == AiGenerationJobType.AiImage &&
                     images is not null &&
                     images.TryGetValue(question.Id, out var image))
            {
                isCompleted =
                    image.ImageBytes.Length > 0 &&
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
                    pending++;
                    break;
                case AiGenerationJobStatus.Failed:
                    failed++;
                    break;
                default:
                    missing++;
                    break;
            }
        }

        var lastError = jobs
            .Where(x =>
                x.JobType == type &&
                x.Status == AiGenerationJobStatus.Failed &&
                !string.IsNullOrWhiteSpace(x.LastError))
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => x.LastError)
            .FirstOrDefault();

        return new AiGenerationCounts(
            missing,
            pending,
            processing,
            completed,
            failed,
            lastError);
    }

    private enum EnsureResult
    {
        Created,
        Requeued,
        FailedRetried,
        Skipped
    }
}