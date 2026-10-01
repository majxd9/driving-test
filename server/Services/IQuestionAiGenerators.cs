using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed record GeneratedAudioResult(byte[] Bytes,string ContentType="audio/mpeg");
public sealed record GeneratedImageResult(byte[] Bytes,string ContentType="image/png");

public interface IQuestionAudioGenerator
{
    Task<GeneratedAudioResult> GenerateAsync(Question question,CancellationToken cancellationToken);
}

public interface IQuestionImageGenerator
{
    Task<GeneratedImageResult> GenerateAsync(Question question,CancellationToken cancellationToken);
}