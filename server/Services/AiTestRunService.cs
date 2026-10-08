using System.Security.Cryptography;
using System.Text;
using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public sealed record AiTestRunView(
    long Id,
    int QuestionId,
    string QuestionText,
    string Category,
    string Type,
    string Provider,
    string Status,
    string ContentHash,
    string Prompt,
    string NegativePrompt,
    bool HasMedia,
    string? MediaUrl,
    string? ContentType,
    string? ErrorType,
    string? ErrorMessage,
    int Attempts,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt);

public sealed class AiTestRunService
{
    private readonly AppDbContext _db;
    public AiTestRunService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AiTestRunView> CreateAsync(
        int questionId,
        AiTestRunType type,
        string provider,
        CancellationToken cancellationToken)
    {
        provider = NormalizeProvider(provider);

        var question = await _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(q => q.Id == questionId, cancellationToken);

        if (question is null)
            throw new KeyNotFoundException("السؤال غير موجود.");

        ValidateProvider(type, provider);

        if (type == AiTestRunType.Image &&
            !QuestionImagePromptBuilder.ShouldGenerate(question))
            throw new InvalidOperationException(
                "هذا السؤال غير مطلوب له توليد صورة AI حسب قواعد المشروع.");

        var (prompt, negative) = type == AiTestRunType.Image
            ? QuestionImagePromptBuilder.Build(question)
            : (QuestionAudioTextBuilder.Build(question), string.Empty);

        var contentHash = type == AiTestRunType.Image
            ? QuestionImagePromptBuilder.GetContentHash(question)
            : QuestionAudioTextBuilder.GetCurrentHash(question);

        var activeExists = await _db.AiTestRuns.AnyAsync(
            x => (x.Status == AiTestRunStatus.Pending ||
                  x.Status == AiTestRunStatus.Processing),
            cancellationToken);

        if (activeExists)
            throw new InvalidOperationException(
                "يوجد اختبار توليد آخر قيد التنفيذ. انتظر نتيجته أو ارفضه أولاً.");

        var run = new AiTestRun
        {
            QuestionId = questionId,
            Type = type,
            Provider = provider,
            Status = AiTestRunStatus.Pending,
            ContentHash = contentHash,
            Prompt = prompt,
            NegativePrompt = negative,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.AiTestRuns.Add(run);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetViewAsync(run.Id, cancellationToken)
            ?? throw new InvalidOperationException("تعذر قراءة اختبار التوليد بعد إنشائه.");
    }

    public async Task<AiTestRun?> ClaimNextAsync(CancellationToken cancellationToken)
    {
        var strategy = _db.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction =
                await _db.Database.BeginTransactionAsync(cancellationToken);

            var run = await _db.AiTestRuns
                .FromSqlRaw("""
                    SELECT * FROM "AiTestRuns"
                    WHERE "Status" = 0
                    ORDER BY "CreatedAt" ASC
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                    """)
                .AsTracking()
                .FirstOrDefaultAsync(cancellationToken);

            if (run is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return null;
            }

            run.Status = AiTestRunStatus.Processing;
            run.Attempts++;
            run.StartedAt = DateTime.UtcNow;
            run.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return run;
        });
    }

    public async Task<AiTestRunView?> GetViewAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var row = await (
            from queryRun in _db.AiTestRuns.AsNoTracking()
            join question in _db.Questions.AsNoTracking()
                on queryRun.QuestionId equals question.Id
            where queryRun.Id == id
            select new
            {
                Run = queryRun,
                QuestionText = question.Text,
                Category = question.Category
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (row is null)
            return null;

        var viewRun = row.Run;
        return new AiTestRunView(
            viewRun.Id,
            viewRun.QuestionId,
            row.QuestionText,
            row.Category.ToString(),
            viewRun.Type.ToString(),
            viewRun.Provider,
            viewRun.Status.ToString(),
            viewRun.ContentHash,
            viewRun.Prompt,
            viewRun.NegativePrompt,
            viewRun.MediaBytes.Length > 0,
            viewRun.MediaBytes.Length > 0
                ? $"/api/admin/ai-generation/test/{viewRun.Id}/media?v={viewRun.UpdatedAt.Ticks}"
                : null,
            viewRun.MediaBytes.Length > 0 ? viewRun.ContentType : null,
            viewRun.ErrorType,
            viewRun.ErrorMessage,
            viewRun.Attempts,
            viewRun.CreatedAt,
            viewRun.StartedAt,
            viewRun.CompletedAt);
    }

    public async Task<byte[]?> GetMediaAsync(long id, CancellationToken cancellationToken)
    {
        var run = await _db.AiTestRuns
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return run is null || run.MediaBytes.Length == 0
            ? null
            : run.MediaBytes;
    }

    public async Task<string?> GetMediaContentTypeAsync(long id, CancellationToken cancellationToken)
    {
        return await _db.AiTestRuns
            .AsNoTracking()
            .Where(x => x.Id == id && x.MediaBytes.Length > 0)
            .Select(x => x.ContentType)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<AiTestRunView?> ApproveAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var run = await _db.AiTestRuns
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (run is null)
            return null;

        if (run.Status != AiTestRunStatus.Succeeded || run.MediaBytes.Length == 0)
            throw new InvalidOperationException(
                "لا يمكن اعتماد الاختبار قبل نجاح التوليد ووصول الملف.");

        var question = await _db.Questions
            .SingleOrDefaultAsync(q => q.Id == run.QuestionId, cancellationToken);

        if (question is null)
            throw new InvalidOperationException("السؤال لم يعد موجوداً.");

        var currentHash = run.Type == AiTestRunType.Image
            ? QuestionImagePromptBuilder.GetContentHash(question)
            : QuestionAudioTextBuilder.GetCurrentHash(question);

        if (!string.Equals(currentHash, run.ContentHash, StringComparison.Ordinal))
            throw new InvalidOperationException(
                "تغيّر محتوى السؤال بعد التوليد، لذلك تم منع اعتماد النتيجة القديمة.");

        if (run.Type == AiTestRunType.Image)
        {
            var imageHash = Convert.ToHexString(
                SHA256.HashData(run.MediaBytes)).ToLowerInvariant();

            var duplicate = await _db.QuestionAiImages
                .AsNoTracking()
                .AnyAsync(
                    x => x.QuestionId != run.QuestionId &&
                         x.ImageBytes.Length > 0 &&
                         x.ImageHash == imageHash,
                    cancellationToken);

            if (duplicate)
                throw new InvalidOperationException(
                    "تم رفض الاعتماد لأن نفس ملف الصورة مستخدم لسؤال آخر.");

            var image = await _db.QuestionAiImages
                .SingleOrDefaultAsync(x => x.QuestionId == run.QuestionId, cancellationToken);

            var generatedAt = DateTime.UtcNow;
            if (image is null)
            {
                _db.QuestionAiImages.Add(new QuestionAiImage
                {
                    QuestionId = run.QuestionId,
                    ImageBytes = run.MediaBytes,
                    ContentHash = run.ContentHash,
                    ImageHash = imageHash,
                    ContentType = run.ContentType,
                    CreatedAt = generatedAt
                });
            }
            else
            {
                image.ImageBytes = run.MediaBytes;
                image.ContentHash = run.ContentHash;
                image.ImageHash = imageHash;
                image.ContentType = run.ContentType;
                image.CreatedAt = generatedAt;
            }

            var review = await _db.AiImageReviews
                .SingleOrDefaultAsync(x => x.QuestionId == run.QuestionId, cancellationToken);
            if (review is null)
            {
                _db.AiImageReviews.Add(new AiImageReview
                {
                    QuestionId = run.QuestionId,
                    ContentHash = run.ContentHash,
                    Status = AiImageReviewStatus.Approved,
                    CreatedAt = generatedAt,
                    ReviewedAt = generatedAt
                });
            }
            else
            {
                review.ContentHash = run.ContentHash;
                review.Status = AiImageReviewStatus.Approved;
                review.CreatedAt = generatedAt;
                review.ReviewedAt = generatedAt;
            }
        }
        else
        {
            var audio = await _db.QuestionAudios
                .SingleOrDefaultAsync(x => x.QuestionId == run.QuestionId, cancellationToken);

            if (audio is null)
            {
                _db.QuestionAudios.Add(new QuestionAudio
                {
                    QuestionId = run.QuestionId,
                    AudioBytes = run.MediaBytes,
                    ContentHash = run.ContentHash,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                audio.AudioBytes = run.MediaBytes;
                audio.ContentHash = run.ContentHash;
                audio.CreatedAt = DateTime.UtcNow;
            }
        }

        run.Status = AiTestRunStatus.Approved;
        run.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetViewAsync(run.Id, cancellationToken);
    }

    public async Task<AiTestRunView?> RejectAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var run = await _db.AiTestRuns
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (run is null)
            return null;

        run.Status = AiTestRunStatus.Rejected;
        run.MediaBytes = Array.Empty<byte>();
        run.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetViewAsync(id, cancellationToken);
    }

    public async Task SetSucceededAsync(
        AiTestRun run,
        byte[] bytes,
        string contentType,
        CancellationToken cancellationToken)
    {
        run.MediaBytes = bytes;
        run.ContentType = string.IsNullOrWhiteSpace(contentType)
            ? "application/octet-stream"
            : contentType;
        run.Status = AiTestRunStatus.Succeeded;
        run.ErrorType = null;
        run.ErrorMessage = null;
        run.CompletedAt = DateTime.UtcNow;
        run.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetFailedAsync(
        AiTestRun run,
        Exception exception,
        CancellationToken cancellationToken)
    {
        run.Status = AiTestRunStatus.Failed;
        run.ErrorType = exception.GetType().Name;
        run.ErrorMessage = SanitizeError(exception.Message);
        run.CompletedAt = DateTime.UtcNow;
        run.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task CleanupAsync(CancellationToken cancellationToken)
    {
        var staleProcessingCutoff = DateTime.UtcNow.AddMinutes(-45);
        await _db.AiTestRuns
            .Where(x =>
                x.Status == AiTestRunStatus.Processing &&
                x.UpdatedAt < staleProcessingCutoff)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(x => x.Status, AiTestRunStatus.Failed)
                    .SetProperty(x => x.ErrorType, "StaleRun")
                    .SetProperty(x => x.ErrorMessage, "انتهت مهلة اختبار التوليد أثناء التنفيذ. لم يتم اعتماد أي نتيجة.")
                    .SetProperty(x => x.CompletedAt, DateTime.UtcNow)
                    .SetProperty(x => x.UpdatedAt, DateTime.UtcNow),
                cancellationToken);

        var cutoff = DateTime.UtcNow.AddHours(-24);
        await _db.AiTestRuns
            .Where(x =>
                x.UpdatedAt < cutoff &&
                (x.Status == AiTestRunStatus.Approved ||
                 x.Status == AiTestRunStatus.Rejected ||
                 x.Status == AiTestRunStatus.Failed))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private void ValidateProvider(AiTestRunType type, string provider)
    {
        var allowed = type == AiTestRunType.Image
            ? new[] { "gemini", "huggingface", "edenai", "comfyui" }
            : new[] { "elevenlabs", "edenai", "local", "fish", "fishaudio" };

        if (!allowed.Contains(provider, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"مزود {type} غير مدعوم: {provider}");
    }

    private static string NormalizeProvider(string provider) =>
        (provider ?? string.Empty).Trim().ToLowerInvariant();

    private static string SanitizeError(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return "حدث خطأ غير معروف أثناء التوليد.";

        var text = message.Replace("\r", " ").Replace("\n", " ").Trim();
        foreach (var secretPrefix in new[] { "key=", "api_key=", "token=" })
        {
            var index = text.IndexOf(secretPrefix, StringComparison.OrdinalIgnoreCase);
            if (index >= 0)
                text = text[..index] + "[مخفي]";
        }

        return text.Length > 1800 ? text[..1800] : text;
    }
}
