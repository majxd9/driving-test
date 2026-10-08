using DrivingTestApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DrivingTestApi.Services;

/// <summary>
/// Periodically removes authentication audit records older than the configured
/// retention window. The default is 90 days and can be overridden with
/// AuthLogs__RetentionDays without changing the code.
/// </summary>
public sealed class AuthLogRetentionService : BackgroundService
{
    private const int DefaultRetentionDays = 90;
    private const int MinimumRetentionDays = 7;
    private const int MaximumRetentionDays = 3650;
    private const int BatchSize = 5000;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuthLogRetentionService> _logger;
    private readonly int _retentionDays;

    public AuthLogRetentionService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<AuthLogRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        var configuredDays = configuration.GetValue<int?>("AuthLogs:RetentionDays");
        _retentionDays = configuredDays is >= MinimumRetentionDays and <= MaximumRetentionDays
            ? configuredDays.Value
            : DefaultRetentionDays;

        if (configuredDays is not null && configuredDays != _retentionDays)
        {
            _logger.LogWarning(
                "Invalid AuthLogs retention setting {ConfiguredDays}. Falling back to {RetentionDays} days.",
                configuredDays,
                DefaultRetentionDays);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once after startup, then repeat daily while the Render instance is awake.
        await CleanupAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await CleanupAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddDays(-_retentionDays);
        var deletedTotal = 0;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            while (!cancellationToken.IsCancellationRequested)
            {
                var staleIds = await db.AuthLogs
                    .AsNoTracking()
                    .Where(log => log.Timestamp < cutoff)
                    .OrderBy(log => log.Timestamp)
                    .ThenBy(log => log.Id)
                    .Select(log => log.Id)
                    .Take(BatchSize)
                    .ToListAsync(cancellationToken);

                if (staleIds.Count == 0)
                    break;

                var deleted = await db.AuthLogs
                    .Where(log => staleIds.Contains(log.Id))
                    .ExecuteDeleteAsync(cancellationToken);

                deletedTotal += deleted;

                if (deleted == 0)
                    break;
            }

            _logger.LogInformation(
                "AuthLog retention cleanup completed. RetentionDays={RetentionDays}, CutoffUtc={CutoffUtc}, Deleted={Deleted}.",
                _retentionDays,
                cutoff,
                deletedTotal);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        catch (Exception ex)
        {
            // Retention maintenance must never take the API down.
            _logger.LogError(ex, "AuthLog retention cleanup failed.");
        }
    }
}
