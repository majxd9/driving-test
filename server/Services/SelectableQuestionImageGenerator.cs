using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class SelectableQuestionImageGenerator : IQuestionImageGenerator
{
    private readonly AiGenerationJobService _jobs;
    private readonly GeminiQuestionImageGenerator _gemini;
    private readonly FallbackQuestionImageGenerator _huggingFace;
    private readonly EdenAiQuestionImageGenerator _eden;
    private readonly ComfyUiQuestionImageGenerator _comfyUi;

    public SelectableQuestionImageGenerator(
        AiGenerationJobService jobs,
        GeminiQuestionImageGenerator gemini,
        FallbackQuestionImageGenerator huggingFace,
        EdenAiQuestionImageGenerator eden,
        ComfyUiQuestionImageGenerator comfyUi)
    {
        _jobs = jobs;
        _gemini = gemini;
        _huggingFace = huggingFace;
        _eden = eden;
        _comfyUi = comfyUi;
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var control = await _jobs.GetControlStateAsync(cancellationToken);

        return control.ImageProvider switch
        {
            "gemini" => await _gemini.GenerateAsync(question, cancellationToken),
            "huggingface" => await _huggingFace.GenerateAsync(question, cancellationToken),
            "edenai" => await _eden.GenerateAsync(question, cancellationToken),
            "comfyui" => await _comfyUi.GenerateAsync(question, cancellationToken),
            _ => throw new InvalidOperationException(
                "مزود صور AI غير مفعّل. اختر Gemini أو مزوداً آخر من مركز التوليد.")
        };
    }
}
