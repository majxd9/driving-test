using DrivingTestApi.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DrivingTestApi.Services;

public sealed class AuthLogWriter : BackgroundService
{
    private readonly IAuthLogQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuthLogWriter> _logger;

    public AuthLogWriter(
        IAuthLogQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<AuthLogWriter> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var log in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.AuthLogs.Add(log);
                await db.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist authentication log.");
            }
        }
    }
}
