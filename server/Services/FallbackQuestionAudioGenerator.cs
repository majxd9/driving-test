using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class FallbackQuestionAudioGenerator : IQuestionAudioGenerator
{
    private readonly ElevenLabsQuestionAudioGenerator _primary;
    private readonly EdenAiQuestionAudioGenerator _eden;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FallbackQuestionAudioGenerator> _logger;

    public FallbackQuestionAudioGenerator(
        ElevenLabsQuestionAudioGenerator primary,
        EdenAiQuestionAudioGenerator eden,
        IConfiguration configuration,
        ILogger<FallbackQuestionAudioGenerator> logger)
    {
        _primary = primary;
        _eden = eden;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GeneratedAudioResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _primary.GenerateAsync(question, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception primaryError) when (CanUseEden())
        {
            _logger.LogWarning(
                primaryError,
                "Primary audio provider failed. Switching automatically to Eden AI for question {QuestionId}.",
                question.Id);

            try
            {
                return await _eden.GenerateAsync(question, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception edenError)
            {
                throw new InvalidOperationException(
                    $"المزود الأساسي للصوت فشل، وEden AI فشل أيضاً. الأساسي: {primaryError.Message} | Eden: {edenError.Message}",
                    edenError);
            }
        }
        catch
        {
            throw;
        }
    }

    private bool CanUseEden()
    {
        var key = (_configuration["EDENAI_API_KEY"] ?? string.Empty).Trim();
        var provider = (_configuration["EDENAI_AUDIO_PROVIDER"] ?? string.Empty).Trim();

        return !string.IsNullOrWhiteSpace(key) &&
               !string.IsNullOrWhiteSpace(provider);
    }
}
