using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class SelectableQuestionImageGenerator : IQuestionImageGenerator
{
    private readonly AiGenerationJobService _jobs;
    private readonly GeminiQuestionImageGenerator _gemini;
    private readonly FallbackQuestionImageGenerator _huggingFace;
    private readonly EdenAiQuestionImageGenerator _eden;
    private readonly ComfyUiQuestionImageGenerator _comfyUi;
    private readonly IConfiguration _configuration;

    public SelectableQuestionImageGenerator(
        AiGenerationJobService jobs,
        GeminiQuestionImageGenerator gemini,
        FallbackQuestionImageGenerator huggingFace,
        EdenAiQuestionImageGenerator eden,
        ComfyUiQuestionImageGenerator comfyUi,
        IConfiguration configuration)
    {
        _jobs = jobs;
        _gemini = gemini;
        _huggingFace = huggingFace;
        _eden = eden;
        _comfyUi = comfyUi;
        _configuration = configuration;
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var control = await _jobs.GetControlStateAsync(cancellationToken);

        return control.ImageProvider switch
        {
            "gemini" => await GenerateWithEdenFallbackAsync(
                () => _gemini.GenerateAsync(question, cancellationToken),
                question.Id,
                "Gemini",
                cancellationToken),
            "huggingface" => await _huggingFace.GenerateAsync(question, cancellationToken),
            "edenai" => await _eden.GenerateAsync(question, cancellationToken),
            "comfyui" => await GenerateWithEdenFallbackAsync(
                () => _comfyUi.GenerateAsync(question, cancellationToken),
                question.Id,
                "ComfyUI",
                cancellationToken),
            _ => throw new InvalidOperationException(
                "مزود صور AI غير مفعّل. اختر Gemini أو مزوداً آخر من مركز التوليد.")
        };
    }

    private async Task<GeneratedImageResult> GenerateWithEdenFallbackAsync(
        Func<Task<GeneratedImageResult>> primary,
        int questionId,
        string primaryName,
        CancellationToken cancellationToken)
    {
        try
        {
            return await primary();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception primaryError) when (CanUseEdenFallback())
        {
            try
            {
                var result = await _eden.GenerateAsync(
                    await _jobs.GetQuestionForDiagnosticsAsync(questionId, cancellationToken)
                        ?? throw new InvalidOperationException("السؤال غير موجود."),
                    cancellationToken,
                    allowInternalFallback: false);

                return result;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception edenError)
            {
                throw new InvalidOperationException(
                    $"{primaryName} فشل، وEden AI فشل كـfallback أيضاً. الأساسي: {primaryError.Message} | Eden: {edenError.Message}",
                    edenError);
            }
        }
        catch
        {
            throw;
        }
    }

    private bool CanUseEdenFallback()
    {
        var key = (_configuration["EDENAI_API_KEY"] ?? string.Empty).Trim();
        var provider = (_configuration["EDENAI_IMAGE_PROVIDER"] ?? string.Empty).Trim();

        return !string.IsNullOrWhiteSpace(key) &&
               !string.IsNullOrWhiteSpace(provider);
    }
}
