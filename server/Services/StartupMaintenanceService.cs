using DrivingTestApi.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DrivingTestApi.Services;

/// <summary>
/// Runs non-essential database maintenance after the HTTP pipeline is ready.
/// This keeps cold-start requests from waiting for seed/repair/count work.
/// </summary>
public sealed class StartupMaintenanceService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<StartupMaintenanceService> _logger;

    public StartupMaintenanceService(
        IServiceProvider services,
        ILogger<StartupMaintenanceService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Yield the first turn so ASP.NET can finish listening before maintenance starts.
        await Task.Yield();

        if (stoppingToken.IsCancellationRequested)
            return;

        try
        {
            using var scope = _services.CreateScope();
            await DbSeeder.SeedAsync(scope.ServiceProvider);

            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await QuestionCountCache.InitializeAsync(db);

            _logger.LogInformation("Background startup maintenance completed.");
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        catch (Exception ex)
        {
            // The API remains available; /api/questions/count can initialize the count cache later.
            _logger.LogError(ex, "Background startup maintenance failed.");
        }
    }
}
