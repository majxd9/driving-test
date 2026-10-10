using System.Net.Http.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class FishAudioQuestionAudioGenerator : IQuestionAudioGenerator, ITextToSpeechGenerator
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public FishAudioQuestionAudioGenerator(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public Task<GeneratedAudioResult> GenerateAsync(Question question, CancellationToken cancellationToken) =>
        GenerateTextAsync(QuestionAudioTextBuilder.Build(question), cancellationToken);

    public Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        string? voiceId,
        CancellationToken cancellationToken) =>
        GenerateTextAsync(text, cancellationToken, voiceId);

    private async Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        CancellationToken cancellationToken,
        string? voiceIdOverride = null)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("نص الصوت فارغ.", nameof(text));

        var apiKey = (_configuration["FISH_AUDIO_API_KEY"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("لم يتم ضبط FISH_AUDIO_API_KEY على الخادم.");

        var model = (_configuration["FISH_AUDIO_MODEL"] ?? "s2.1-pro-free").Trim();
        if (string.IsNullOrWhiteSpace(model))
            model = "s2.1-pro-free";

        var configuredVoiceId = (_configuration["FISH_AUDIO_VOICE_ID"] ?? string.Empty).Trim();
        var voiceId = string.IsNullOrWhiteSpace(voiceIdOverride)
            ? configuredVoiceId
            : voiceIdOverride.Trim();

        var payload = new Dictionary<string, object>
        {
            ["text"] = text,
            ["format"] = "mp3"
        };

        if (!string.IsNullOrWhiteSpace(voiceId))
            payload["reference_id"] = voiceId;

        var client = _httpClientFactory.CreateClient("FishAudio");

        using var request = new HttpRequestMessage(HttpMethod.Post, "v1/tts");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("model", model);
        request.Content = JsonContent.Create(payload);

        using var response = await client.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            var trimmed = string.IsNullOrWhiteSpace(error)
                ? "بدون تفاصيل من Fish Audio."
                : error.Length > 1000 ? error[..1000] : error;

            throw new HttpRequestException(
                $"Fish Audio رفض توليد الصوت: HTTP {(int)response.StatusCode} — {trimmed}");
        }

        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (bytes.Length == 0)
            throw new InvalidOperationException("تمت استجابة Fish Audio بدون ملف صوتي.");

        return new GeneratedAudioResult(bytes, "audio/mpeg");
    }
}