using DrivingTestApi.Data;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public sealed record AiGenerationQuota(
    int Limit,
    int Used,
    int Remaining,
    DateTime MonthStartUtc);

public sealed class AiGenerationQuotaService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public AiGenerationQuotaService(
        AppDbContext db,
        IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public int MonthlyLimit =>
        Math.Max(
            1,
            _configuration.GetValue("AI_MONTHLY_GENERATION_LIMIT", 600));

    public DateTime CurrentMonthStartUtc
    {
        get
        {
            var now = DateTime.UtcNow;
            return new DateTime(
                now.Year,
                now.Month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);
        }
    }

    public DateTime NextMonthStartUtc
    {
        get
        {
            var current = CurrentMonthStartUtc;
            return current.AddMonths(1);
        }
    }

    public async Task<AiGenerationQuota> GetQuotaAsync(
        CancellationToken cancellationToken)
    {
        var monthStart = CurrentMonthStartUtc;

        var used = await _db.Database
            .SqlQuery<int>($"""
                SELECT COALESCE("GeneratedCount", 0)::integer AS "Value"
                FROM "AiGenerationUsage"
                WHERE "MonthStart" = {monthStart}
                """)
            .SingleOrDefaultAsync(cancellationToken);

        return new AiGenerationQuota(
            MonthlyLimit,
            used,
            Math.Max(0, MonthlyLimit - used),
            monthStart);
    }

    // Consumes one monthly generation slot immediately before an actual
    // ElevenLabs/Piper/ComfyUI generation call. The SQL update is atomic,
    // so multiple workers cannot exceed the configured monthly limit.
    public async Task<bool> TryConsumeAsync(
        CancellationToken cancellationToken)
    {
        var monthStart = CurrentMonthStartUtc;

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "AiGenerationUsage" ("MonthStart", "GeneratedCount")
            VALUES ({monthStart}, 0)
            ON CONFLICT ("MonthStart") DO NOTHING;
            """, cancellationToken);

        var updated = await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AiGenerationUsage"
            SET "GeneratedCount" = "GeneratedCount" + 1
            WHERE "MonthStart" = {monthStart}
              AND "GeneratedCount" < {MonthlyLimit};
            """, cancellationToken);

        return updated == 1;
    }
}
