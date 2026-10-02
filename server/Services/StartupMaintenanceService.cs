using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

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

            await EnsureSystemAudioPromptsAsync(
                db,
                scope.ServiceProvider.GetRequiredService<FallbackQuestionAudioGenerator>(),
                stoppingToken);

            _logger.LogInformation("Background startup maintenance completed.");
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
            return;
        }
        catch (Exception ex)
        {
            // The API remains available; /api/questions/count can initialize the count cache later.
            _logger.LogError(ex, "Background startup maintenance failed before system-audio restoration.");
        }
    }

    private async Task EnsureSystemAudioPromptsAsync(
        AppDbContext db,
        FallbackQuestionAudioGenerator audioGenerator,
        CancellationToken cancellationToken)
    {
        const string voiceId = "0IwoSbTUTTn6egOMrnel";

        var prompts = new[]
        {
            (Key: SystemAudioCatalog.FirstEntry, Text: "إذا بدك تشغيل الصوت، اضغط زر التشغيل."),
            (Key: SystemAudioCatalog.Enabled, Text: "الصوت سيبقى شغال حتى تضغط إيقاف."),
            (Key: SystemAudioCatalog.Disabled, Text: "الصوت متوقف.")
        };

        var changed = 0;

        foreach (var prompt in prompts)
        {
            var hash = QuestionAudioTextBuilder.HashText(prompt.Text);
            var existing = await db.SystemAudios
                .SingleOrDefaultAsync(x => x.Key == prompt.Key, cancellationToken);

            if (existing is not null &&
                existing.ContentHash == hash &&
                existing.AudioBytes.Length > 0)
            {
                continue;
            }

            var result = await audioGenerator.GenerateTextAsync(
                prompt.Text,
                voiceId,
                cancellationToken);

            if (result.Bytes.Length == 0)
                throw new InvalidOperationException(
                    $"تعذر إنشاء رسالة الصوت النظامية: {prompt.Key}");

            if (existing is null)
            {
                db.SystemAudios.Add(new SystemAudio
                {
                    Key = prompt.Key,
                    AudioBytes = result.Bytes,
                    ContentHash = hash,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.AudioBytes = result.Bytes;
                existing.ContentHash = hash;
                existing.CreatedAt = DateTime.UtcNow;
            }

            changed++;
        }

        if (changed > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "System audio prompts restored/generated: {Count}.",
                changed);
        }
    }
}
