using System.Security;
using System.Text;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class AzureSpeechQuestionAudioGenerator : IQuestionAudioGenerator
{
    private const string DefaultVoice = "ar-SY-AmanyNeural";
    private const string DefaultLocale = "ar-SY";
    private const string DefaultOutputFormat = "audio-24khz-96kbitrate-mono-mp3";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AzureSpeechQuestionAudioGenerator> _logger;

    public AzureSpeechQuestionAudioGenerator(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AzureSpeechQuestionAudioGenerator> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public Task<GeneratedAudioResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        return GenerateTextAsync(
            QuestionAudioTextBuilder.Build(question),
            cancellationToken);
    }

    public async Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("نص الصوت فارغ.", nameof(text));

        var key = (_configuration["AZURE_SPEECH_KEY"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("لم يتم ضبط AZURE_SPEECH_KEY على الخادم.");

        var region = (_configuration["AZURE_SPEECH_REGION"] ?? string.Empty).Trim();
        var endpoint = (_configuration["AZURE_SPEECH_ENDPOINT"] ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            if (string.IsNullOrWhiteSpace(region))
                throw new InvalidOperationException(
                    "يجب ضبط AZURE_SPEECH_REGION أو AZURE_SPEECH_ENDPOINT على الخادم.");

            endpoint =
                $"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1";
        }

        var voice = (_configuration["QUESTION_AUDIO_AZURE_VOICE"] ?? DefaultVoice).Trim();
        var locale = (_configuration["QUESTION_AUDIO_AZURE_LOCALE"] ?? DefaultLocale).Trim();
        var rate = (_configuration["QUESTION_AUDIO_AZURE_RATE"] ?? "0%").Trim();
        var pitch = (_configuration["QUESTION_AUDIO_AZURE_PITCH"] ?? "0%").Trim();
        var outputFormat =
            (_configuration["QUESTION_AUDIO_AZURE_OUTPUT_FORMAT"] ?? DefaultOutputFormat).Trim();

        if (string.IsNullOrWhiteSpace(voice))
            voice = DefaultVoice;
        if (string.IsNullOrWhiteSpace(locale))
            locale = DefaultLocale;
        if (string.IsNullOrWhiteSpace(rate))
            rate = "0%";
        if (string.IsNullOrWhiteSpace(pitch))
            pitch = "0%";
        if (string.IsNullOrWhiteSpace(outputFormat))
            outputFormat = DefaultOutputFormat;

        var safeText = SecurityElement.Escape(text) ?? string.Empty;
        var safeVoice = SecurityElement.Escape(voice) ?? DefaultVoice;
        var safeLocale = SecurityElement.Escape(locale) ?? DefaultLocale;
        var safeRate = SecurityElement.Escape(rate) ?? "0%";
        var safePitch = SecurityElement.Escape(pitch) ?? "0%";

        var ssml = $"""
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
                   xmlns:mstts="http://www.w3.org/2001/mstts"
                   xml:lang="{safeLocale}">
              <voice name="{safeVoice}">
                <prosody rate="{safeRate}" pitch="{safePitch}">{safeText}</prosody>
              </voice>
            </speak>
            """;

        var client = _httpClientFactory.CreateClient("AzureSpeech");
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml")
        };

        request.Headers.TryAddWithoutValidation("Ocp-Apim-Subscription-Key", key);
        request.Headers.TryAddWithoutValidation("X-Microsoft-OutputFormat", outputFormat);
        request.Headers.TryAddWithoutValidation("User-Agent", "Rukhsati-QuestionAudio");

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(
            Math.Clamp(_configuration.GetValue("QUESTION_AUDIO_AZURE_TIMEOUT_SECONDS", 90), 15, 300)));

        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            timeout.Token);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(timeout.Token);
            var details = body.Length > 1200 ? body[..1200] : body;

            throw new HttpRequestException(
                $"Azure Speech رفض توليد الصوت: HTTP {(int)response.StatusCode} — {details}");
        }

        var bytes = await response.Content.ReadAsByteArrayAsync(timeout.Token);
        if (bytes.Length == 0)
            throw new InvalidOperationException("Azure Speech أعاد استجابة صوتية فارغة.");

        var contentType =
            response.Content.Headers.ContentType?.MediaType?.Trim() ?? "audio/mpeg";

        _logger.LogInformation(
            "Azure Speech question audio generation succeeded: voice={Voice}, locale={Locale}, bytes={Bytes}, contentType={ContentType}.",
            voice,
            locale,
            bytes.Length,
            contentType);

        return new GeneratedAudioResult(bytes, contentType);
    }
}
