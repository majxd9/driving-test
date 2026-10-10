using System.Diagnostics;
using System.Net.Http.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class LocalQuestionAudioGenerator : IQuestionAudioGenerator, ITextToSpeechGenerator
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public LocalQuestionAudioGenerator(IHttpClientFactory httpClientFactory,IConfiguration configuration)
    { _httpClientFactory=httpClientFactory;_configuration=configuration; }

    public Task<GeneratedAudioResult> GenerateAsync(Question question,CancellationToken cancellationToken) =>
        GenerateTextAsync(QuestionAudioTextBuilder.Build(question), null, cancellationToken);

    public async Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        string? voiceId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("نص الصوت فارغ.", nameof(text));

        var client = _httpClientFactory.CreateClient("LocalTts");
        var payload = new Dictionary<string, object?> { ["text"] = text };
        var voice = string.IsNullOrWhiteSpace(voiceId)
            ? _configuration["QUESTION_AUDIO_LOCAL_VOICE"]
            : voiceId;
        if (!string.IsNullOrWhiteSpace(voice))
            payload["voice"] = voice;

        using var response = await client.PostAsJsonAsync("/synthesize", payload, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"خدمة TTS المحلية رفضت الطلب: HTTP {(int)response.StatusCode} — {await response.Content.ReadAsStringAsync(cancellationToken)}");

        var wav = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (wav.Length < 44)
            throw new InvalidOperationException("خدمة TTS المحلية أعادت ملف WAV غير صالح.");
        return new GeneratedAudioResult(await ConvertWavToMp3Async(wav, cancellationToken));
    }

    private async Task<byte[]> ConvertWavToMp3Async(byte[] wav,CancellationToken cancellationToken)
    {
        var executable=_configuration["QUESTION_AUDIO_FFMPEG_PATH"]??"ffmpeg";
        var bitrate=_configuration["QUESTION_AUDIO_MP3_BITRATE"]??"128k";
        var psi=new ProcessStartInfo{FileName=executable,Arguments=$"-hide_banner -loglevel error -i pipe:0 -codec:a libmp3lame -b:a {bitrate} -f mp3 pipe:1",
            RedirectStandardInput=true,RedirectStandardOutput=true,RedirectStandardError=true,UseShellExecute=false,CreateNoWindow=true};
        using var process=Process.Start(psi)??throw new InvalidOperationException("تعذر تشغيل ffmpeg. تحقق من QUESTION_AUDIO_FFMPEG_PATH.");
        await process.StandardInput.BaseStream.WriteAsync(wav,cancellationToken);
        process.StandardInput.Close();
        using var output=new MemoryStream();
        var copyTask=process.StandardOutput.BaseStream.CopyToAsync(output,cancellationToken);
        var errorTask=process.StandardError.ReadToEndAsync(cancellationToken);
        await Task.WhenAll(copyTask,errorTask);
        await process.WaitForExitAsync(cancellationToken);
        if(process.ExitCode!=0||output.Length==0)
        {
            var error=await errorTask;
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(error)?"تعذر تحويل صوت Piper من WAV إلى MP3.":$"ffmpeg: {error.Trim()}");
        }
        return output.ToArray();
    }
}