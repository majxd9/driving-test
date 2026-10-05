using DrivingTestApi.Data;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/admin/ai-generation/audio-repair")]
[Authorize(Roles = "Admin")]
public sealed class AiGenerationAudioRepairController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AiGenerationJobService _jobs;

    public AiGenerationAudioRepairController(AppDbContext db, AiGenerationJobService jobs)
    {
        _db = db;
        _jobs = jobs;
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken cancellationToken)
    {
        var total = await _db.Questions.CountAsync(cancellationToken);
        var stored = await _db.QuestionAudios
            .AsNoTracking()
            .CountAsync(x => x.AudioBytes.Length > 0, cancellationToken);

        var pending = await _db.AiGenerationJobs
            .AsNoTracking()
            .CountAsync(x => x.JobType == AiGenerationJobType.Audio && x.Status == AiGenerationJobStatus.Pending, cancellationToken);
        var processing = await _db.AiGenerationJobs
            .AsNoTracking()
            .CountAsync(x => x.JobType == AiGenerationJobType.Audio && x.Status == AiGenerationJobStatus.Processing, cancellationToken);
        var failed = await _db.AiGenerationJobs
            .AsNoTracking()
            .CountAsync(x => x.JobType == AiGenerationJobType.Audio && x.Status == AiGenerationJobStatus.Failed, cancellationToken);

        return Ok(new
        {
            total,
            stored,
            missing = Math.Max(0, total - stored),
            pending,
            processing,
            failed
        });
    }

    [HttpPost("reconcile")]
    public async Task<IActionResult> Reconcile(CancellationToken cancellationToken)
    {
        await _jobs.SetControlStateAsync(true, null, cancellationToken);
        await _jobs.ResumePendingTypeAsync(AiGenerationJobType.Audio, cancellationToken);

        // Existing audio bytes are already usable. Historical jobs may still point
        // at old TTS hashes; mark those jobs completed instead of regenerating audio.
        var closedHistoricalJobs = await _db.Database.ExecuteSqlRawAsync("""
            UPDATE "AiGenerationJobs" AS j
            SET "Status" = 2,
                "LastError" = NULL,
                "NextAttemptAt" = NULL,
                "LockedUntil" = NULL,
                "UpdatedAt" = NOW(),
                "CompletedAt" = COALESCE("CompletedAt", NOW())
            WHERE j."JobType" = 0
              AND j."Status" IN (0, 3)
              AND EXISTS (
                  SELECT 1 FROM "QuestionAudios" AS a
                  WHERE a."QuestionId" = j."QuestionId"
                    AND octet_length(a."AudioBytes") > 0
              );
            """, cancellationToken);

        var questionsWithoutAudio = await _db.Questions
            .AsNoTracking()
            .Where(q => !_db.QuestionAudios.Any(a => a.QuestionId == q.Id && a.AudioBytes.Length > 0))
            .OrderBy(q => q.Id)
            .ToListAsync(cancellationToken);

        var created = 0;
        foreach (var question in questionsWithoutAudio)
        {
            var hash = QuestionAudioTextBuilder.GetCurrentHash(question);
            var exists = await _db.AiGenerationJobs.AnyAsync(
                x => x.QuestionId == question.Id &&
                     x.JobType == AiGenerationJobType.Audio &&
                     x.ContentHash == hash,
                cancellationToken);

            if (exists) continue;

            _db.AiGenerationJobs.Add(new AiGenerationJob
            {
                QuestionId = question.Id,
                JobType = AiGenerationJobType.Audio,
                Status = AiGenerationJobStatus.Pending,
                Attempts = 0,
                ContentHash = hash,
                Priority = 90,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                NextAttemptAt = DateTime.UtcNow
            });
            created++;
        }

        await _db.SaveChangesAsync(cancellationToken);
        var status = await BuildStatusAsync(cancellationToken);

        return Ok(new
        {
            created,
            closedHistoricalJobs,
            status
        });
    }

    private async Task<object> BuildStatusAsync(CancellationToken cancellationToken)
    {
        var total = await _db.Questions.CountAsync(cancellationToken);
        var stored = await _db.QuestionAudios.AsNoTracking().CountAsync(x => x.AudioBytes.Length > 0, cancellationToken);
        var pending = await _db.AiGenerationJobs.AsNoTracking().CountAsync(x => x.JobType == AiGenerationJobType.Audio && x.Status == AiGenerationJobStatus.Pending, cancellationToken);
        var processing = await _db.AiGenerationJobs.AsNoTracking().CountAsync(x => x.JobType == AiGenerationJobType.Audio && x.Status == AiGenerationJobStatus.Processing, cancellationToken);
        var failed = await _db.AiGenerationJobs.AsNoTracking().CountAsync(x => x.JobType == AiGenerationJobType.Audio && x.Status == AiGenerationJobStatus.Failed, cancellationToken);
        return new { total, stored, missing = Math.Max(0, total - stored), pending, processing, failed };
    }
}
