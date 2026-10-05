using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DrivingTestApi.Services;

public sealed class AiTestRunWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AiTestRunWorker> _logger;

    public AiTestRunWorker(IServiceScopeFactory scopeFactory, ILogger<AiTestRunWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var runs = scope.ServiceProvider.GetRequiredService<AiTestRunService>();
                var run = await runs.ClaimNextAsync(stoppingToken);

                if (run is null)
                {
                    await runs.CleanupAsync(stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                    continue;
                }

                await ProcessAsync(scope.ServiceProvider, run, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI test worker loop failed.");
                await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
            }
        }
    }

    private static async Task ProcessAsync(
        IServiceProvider services,
        AiTestRun run,
        CancellationToken cancellationToken)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var runner = services.GetRequiredService<AiTestRunService>();
        var configuration = services.GetRequiredService<IConfiguration>();

        var question = await db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(q => q.Id == run.QuestionId, cancellationToken);

        if (question is null)
        {
            await runner.SetFailedAsync(
                run,
                new InvalidOperationException("السؤال لم يعد موجوداً."),
                cancellationToken);
            return;
        }

        var currentHash = run.Type == AiTestRunType.Image
            ? QuestionImagePromptBuilder.GetContentHash(question)
            : QuestionAudioTextBuilder.GetCurrentHash(question);

        if (!string.Equals(currentHash, run.ContentHash, StringComparison.Ordinal))
        {
            await runner.SetFailedAsync(
                run,
                new InvalidOperationException("تغيّر محتوى السؤال قبل بدء الاختبار."),
                cancellationToken);
            return;
        }

        try
        {
            if (run.Type == AiTestRunType.Image)
            {
                var result = run.Provider switch
                {
                    "gemini" => await services.GetRequiredService<GeminiQuestionImageGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    "huggingface" => await services.GetRequiredService<HuggingFaceQuestionImageGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    "edenai" => await services.GetRequiredService<EdenAiQuestionImageGenerator>()
                        .GenerateAsync(question, cancellationToken, allowInternalFallback: false),
                    "comfyui" => await services.GetRequiredService<ComfyUiQuestionImageGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    _ => throw new InvalidOperationException($"مزود الصور غير مدعوم: {run.Provider}")
                };

                await runner.SetSucceededAsync(
                    run,
                    result.Bytes,
                    result.ContentType,
                    cancellationToken);
            }
            else
            {
                var result = run.Provider switch
                {
                    "elevenlabs" => await services.GetRequiredService<ElevenLabsQuestionAudioGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    "edenai" => await services.GetRequiredService<EdenAiQuestionAudioGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    "local" => await services.GetRequiredService<LocalQuestionAudioGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    "fish" => await services.GetRequiredService<FishAudioQuestionAudioGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    "fishaudio" => await services.GetRequiredService<FishAudioQuestionAudioGenerator>()
                        .GenerateAsync(question, cancellationToken),
                    _ => throw new InvalidOperationException($"مزود الصوت غير مدعوم: {run.Provider}")
                };

                await runner.SetSucceededAsync(
                    run,
                    result.Bytes,
                    "audio/mpeg",
                    cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            await runner.SetFailedAsync(run, ex, cancellationToken);
        }
    }
}
