using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DrivingTestApi.Services;

public interface IGeminiService
{
    bool IsConfigured { get; }
    string Model { get; }
    Task<GeminiGenerateResult> GenerateAsync(
        string prompt,
        string? systemInstruction = null,
        string? previousInteractionId = null,
        CancellationToken cancellationToken = default);
}

public sealed record GeminiGenerateResult(
    string Text,
    string? InteractionId,
    string Model);

public sealed class GeminiService : IGeminiService
{
    private const string DefaultModel = "gemini-3.8-flash";
    private const string Endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GeminiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_configuration["GEMINI_API_KEY"]);

    public string Model =>
        (_configuration["GEMINI_MODEL"] ?? DefaultModel).Trim();

    public async Task<GeminiGenerateResult> GenerateAsync(
        string prompt,
        string? systemInstruction = null,
        string? previousInteractionId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "لم يتم ضبط GEMINI_API_KEY على الخادم.");

        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt مطلوب.", nameof(prompt));

        if (prompt.Length > 12000)
            throw new ArgumentException("Prompt طويل جداً. الحد الأقصى 12000 محرف.", nameof(prompt));

        var body = new Dictionary<string, object?>
        {
            ["model"] = Model,
            ["input"] = prompt,
            ["store"] = false
        };

        if (!string.IsNullOrWhiteSpace(systemInstruction))
            body["system_instruction"] = systemInstruction.Trim();

        if (!string.IsNullOrWhiteSpace(previousInteractionId))
            body["previous_interaction_id"] = previousInteractionId.Trim();

        var json = JsonSerializer.Serialize(body);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(
            Math.Clamp(_configuration.GetValue("GEMINI_TIMEOUT_SECONDS", 90), 15, 300)));

        using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        var apiKey = _configuration["GEMINI_API_KEY"]!.Trim();
        request.Headers.Add("x-goog-api-key", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var client = _httpClientFactory.CreateClient("Gemini");
            using var response = await client.SendAsync(request, timeout.Token);
            var responseText = await response.Content.ReadAsStringAsync(timeout.Token);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Gemini API request failed: HTTP {StatusCode}.",
                    (int)response.StatusCode);

                throw new InvalidOperationException(
                    $"Gemini API رفض الطلب: HTTP {(int)response.StatusCode}. " +
                    ExtractApiError(responseText));
            }

            using var document = JsonDocument.Parse(responseText);
            var root = document.RootElement;

            var interactionId = root.TryGetProperty("id", out var idElement)
                ? idElement.GetString()
                : null;

            var outputText = ExtractOutputText(root);

            if (string.IsNullOrWhiteSpace(outputText))
                throw new InvalidOperationException(
                    "Gemini استجاب بدون نص قابل للقراءة.");

            return new GeminiGenerateResult(
                outputText.Trim(),
                interactionId,
                Model);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new InvalidOperationException(
                "انتهت مهلة الاتصال مع Gemini.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Gemini API network request failed.");
            throw new InvalidOperationException(
                "تعذر الاتصال بخدمة Gemini.");
        }
    }

    private static string ExtractOutputText(JsonElement root)
    {
        if (root.TryGetProperty("output_text", out var outputTextElement) &&
            outputTextElement.ValueKind == JsonValueKind.String)
        {
            return outputTextElement.GetString() ?? string.Empty;
        }

        if (!root.TryGetProperty("outputs", out var outputs) ||
            outputs.ValueKind != JsonValueKind.Array)
            return string.Empty;

        var text = new StringBuilder();

        foreach (var output in outputs.EnumerateArray())
        {
            if (output.TryGetProperty("text", out var textElement) &&
                textElement.ValueKind == JsonValueKind.String)
            {
                text.Append(textElement.GetString());
            }
        }

        return text.ToString();
    }

    private static string ExtractApiError(string responseText)
    {
        if (string.IsNullOrWhiteSpace(responseText))
            return "بدون تفاصيل إضافية.";

        try
        {
            using var document = JsonDocument.Parse(responseText);

            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message) &&
                message.ValueKind == JsonValueKind.String)
            {
                return message.GetString() ?? "بدون تفاصيل إضافية.";
            }
        }
        catch (JsonException)
        {
            // Use a truncated raw response below when the provider returns non-JSON.
        }

        return responseText.Length > 500
            ? responseText[..500]
            : responseText;
    }
}
