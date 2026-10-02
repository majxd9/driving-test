using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class EdenAiQuestionAudioGenerator : IQuestionAudioGenerator
{
    private const string Endpoint = "v2/audio/text_to_speech";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EdenAiQuestionAudioGenerator> _logger;

    public EdenAiQuestionAudioGenerator(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<EdenAiQuestionAudioGenerator> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public Task<GeneratedAudioResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken) =>
        GenerateTextAsync(QuestionAudioTextBuilder.Build(question), cancellationToken);

    public async Task<GeneratedAudioResult> GenerateTextAsync(
        string text,
        CancellationToken cancellationToken)
    {
        var apiKey = (_configuration["EDENAI_API_KEY"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("لم يتم ضبط EDENAI_API_KEY.");

        var primaryProvider = GetRequiredProvider("EDENAI_AUDIO_PROVIDER");
        var fallbackProviders = GetProviderList("EDENAI_AUDIO_FALLBACK_PROVIDERS");

        var payload = new Dictionary<string, object?>
        {
            ["providers"] = primaryProvider,
            ["fallback_providers"] = string.Join(",", fallbackProviders),
            ["language"] = _configuration["EDENAI_AUDIO_LANGUAGE"]?.Trim() is { Length: > 0 } language
                ? language
                : "ar",
            ["option"] = _configuration["EDENAI_AUDIO_OPTION"]?.Trim() is { Length: > 0 } option
                ? option
                : "MALE",
            ["return_type"] = "url",
            ["text"] = text
        };

        var voiceModel = (_configuration["EDENAI_AUDIO_VOICE_MODEL_" + primaryProvider.ToUpperInvariant()] ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(voiceModel))
            payload["settings"] = new Dictionary<string, string> { [primaryProvider] = voiceModel };

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(
            Math.Clamp(_configuration.GetValue("QUESTION_AUDIO_TIMEOUT_SECONDS", 180), 30, 600)));

        var client = _httpClientFactory.CreateClient("EdenAI");
        using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = JsonContent.Create(payload)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            timeout.Token);

        var body = await response.Content.ReadAsStringAsync(timeout.Token);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"Eden AI رفض توليد الصوت: HTTP {(int)response.StatusCode} — {Truncate(body)}");

        using var document = JsonDocument.Parse(body);

        // Prefer embedded audio bytes when Eden returns them. Resource URLs can
        // expire or return 403 before the worker downloads them.
        var base64 = FindFirstBase64(document.RootElement);
        if (!string.IsNullOrWhiteSpace(base64))
        {
                try
                {
                    var bytes = Convert.FromBase64String(base64);
                    if (bytes.Length > 0)
                        return new GeneratedAudioResult(bytes);
                }
                catch (FormatException)
                {
                    // Fall back to the resource URL below.
                }
            }
        }

        var audioUrl = FindFirstAudioUrl(document.RootElement);
        if (string.IsNullOrWhiteSpace(audioUrl))
        {
            throw new InvalidOperationException(
                $"Eden AI لم يُرجع ملف صوتي فعلياً. المزود الأساسي: {primaryProvider}. التفاصيل: {Truncate(body)}");
        }

        if (TryDecodeDataUrl(audioUrl, out var inlineBytes, out var inlineContentType))
            return new GeneratedAudioResult(inlineBytes, inlineContentType);

        using var audioResponse = await client.GetAsync(audioUrl, timeout.Token);
        if (!audioResponse.IsSuccessStatusCode)
        {
            var error = await audioResponse.Content.ReadAsStringAsync(timeout.Token);
            throw new HttpRequestException(
                $"Eden AI أعاد رابط صوت غير قابل للتنزيل: HTTP {(int)audioResponse.StatusCode} — {Truncate(error)}");
        }

        var audioBytes = await audioResponse.Content.ReadAsByteArrayAsync(timeout.Token);
        if (audioBytes.Length == 0)
            throw new InvalidOperationException("Eden AI أعاد ملف صوتي فارغاً.");

        var contentType =
            audioResponse.Content.Headers.ContentType?.MediaType?.Trim() ??
            "audio/mpeg";

        _logger.LogInformation(
            "Eden AI audio generation succeeded using primary {PrimaryProvider} with {FallbackCount} fallback providers.",
            primaryProvider,
            fallbackProviders.Count);

        return new GeneratedAudioResult(audioBytes, contentType);
    }

    private string GetRequiredProvider(string key)
    {
        var provider = (_configuration[key] ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(provider))
            throw new InvalidOperationException($"لم يتم ضبط {key} لخدمة Eden AI.");
        return provider;
    }

    private List<string> GetProviderList(string key) =>
        (_configuration[key] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToLowerInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Take(5)
            .ToList();

    private static string? FindFirstAudioUrl(JsonElement node)
    {
        if (node.ValueKind == JsonValueKind.Object)
        {
            if (node.TryGetProperty("status", out var status) &&
                status.ValueKind == JsonValueKind.String &&
                string.Equals(status.GetString(), "fail", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            foreach (var name in new[] { "audio_resource_url", "audio_url", "url" })
            {
                if (node.TryGetProperty(name, out var value) &&
                    value.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(value.GetString()))
                    return value.GetString();
            }

            foreach (var property in node.EnumerateObject())
            {
                var found = FindFirstAudioUrl(property.Value);
                if (!string.IsNullOrWhiteSpace(found))
                    return found;
            }
        }
        else if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
            {
                var found = FindFirstAudioUrl(item);
                if (!string.IsNullOrWhiteSpace(found))
                    return found;
            }
        }

        return null;
    }

    private static string? FindFirstBase64(JsonElement node)
    {
        if (node.ValueKind == JsonValueKind.Object)
        {
            foreach (var name in new[] { "audio", "base64", "audio_base64" })
            {
                if (node.TryGetProperty(name, out var value) &&
                    value.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(value.GetString()))
                    return value.GetString();
            }

            foreach (var property in node.EnumerateObject())
            {
                var found = FindFirstBase64(property.Value);
                if (!string.IsNullOrWhiteSpace(found))
                    return found;
            }
        }
        else if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
            {
                var found = FindFirstBase64(item);
                if (!string.IsNullOrWhiteSpace(found))
                    return found;
            }
        }

        return null;
    }

    private static bool TryDecodeDataUrl(
        string value,
        out byte[] bytes,
        out string contentType)
    {
        bytes = Array.Empty<byte>();
        contentType = "audio/mpeg";

        if (!value.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return false;

        var comma = value.IndexOf(',');
        if (comma <= 5)
            return false;

        var metadata = value[5..comma];
        contentType = metadata.Split(';')[0];

        try
        {
            bytes = Convert.FromBase64String(value[(comma + 1)..]);
            return bytes.Length > 0;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static string Truncate(string value) =>
        value.Length > 1200 ? value[..1200] : value;
}
