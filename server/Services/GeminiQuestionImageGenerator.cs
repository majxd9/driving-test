using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class GeminiQuestionImageGenerator : IQuestionImageGenerator
{
    private const string Endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";
    private const string DefaultModel = "gemini-3.1-flash-image";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiQuestionImageGenerator> _logger;
    private readonly QuestionImageReferenceLoader _referenceLoader;

    public GeminiQuestionImageGenerator(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GeminiQuestionImageGenerator> logger,
        QuestionImageReferenceLoader referenceLoader)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _referenceLoader = referenceLoader;
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var apiKey = (_configuration["GEMINI_API_KEY"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("لم يتم ضبط GEMINI_API_KEY.");

        var (positive, negative) = QuestionImagePromptBuilder.Build(question);
        var prompt = $"""
{positive}

NEGATIVE PROMPT:
{negative}
""";

        var model = (_configuration["GEMINI_IMAGE_MODEL"] ?? DefaultModel).Trim();
        var aspectRatio = (_configuration["GEMINI_IMAGE_ASPECT_RATIO"] ?? "16:9").Trim();
        var imageSize = (_configuration["GEMINI_IMAGE_SIZE"] ?? "1K").Trim();

        var body = new
        {
            model,
            // Image generation is intentionally stateless. We do not want a
            // previous interaction or retained provider-side conversation state
            // to influence a later question.
            store = false,
            input = await BuildInputAsync(question, prompt, cancellationToken),
            response_format = new
            {
                type = "image",
                mime_type = "image/jpeg",
                aspect_ratio = aspectRatio,
                image_size = imageSize
            }
        };

        var json = JsonSerializer.Serialize(body);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(
            Math.Clamp(_configuration.GetValue("GEMINI_IMAGE_TIMEOUT_SECONDS", 300), 60, 900)));

        using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        request.Headers.Add("x-goog-api-key", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            var client = _httpClientFactory.CreateClient("Gemini");
            using var response = await client.SendAsync(request, timeout.Token);
            var responseText = await response.Content.ReadAsStringAsync(timeout.Token);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Gemini image generation failed: HTTP {StatusCode}.",
                    (int)response.StatusCode);

                throw new InvalidOperationException(
                    $"Gemini رفض توليد الصورة: HTTP {(int)response.StatusCode}. " +
                    ExtractApiError(responseText));
            }

            using var document = JsonDocument.Parse(responseText);

            var (bytes, contentType) = ExtractImage(document.RootElement);

            if (bytes.Length == 0)
                throw new InvalidOperationException(
                    "Gemini أعاد استجابة ناجحة لكن بدون بيانات صورة.");

            return new GeneratedImageResult(bytes, contentType);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new InvalidOperationException(
                "انتهت مهلة توليد صورة Gemini.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Gemini image generation network request failed.");
            throw new InvalidOperationException("تعذر الاتصال بخدمة Gemini لتوليد الصورة.");
        }
    }

    private async Task<object[]> BuildInputAsync(
        Question question,
        string prompt,
        CancellationToken cancellationToken)
    {
        var reference = await _referenceLoader.LoadAsync(question, cancellationToken);
        if (reference is null)
            return new object[]
            {
                new { type = "text", text = prompt }
            };

        var base64 = Convert.ToBase64String(reference.Bytes);

        _logger.LogInformation(
            "Gemini image generation using source reference image for Question {QuestionId}: {SourceUrl}, {Bytes} bytes, {ContentType}.",
            question.Id,
            reference.SourceUrl,
            reference.Bytes.Length,
            reference.ContentType);

        return new object[]
        {
            new
            {
                type = "image",
                mime_type = reference.ContentType,
                data = base64
            },
            new { type = "text", text = prompt }
        };
    }

    private static (byte[] Bytes, string ContentType) ExtractImage(JsonElement root)
    {
        if (root.TryGetProperty("output_image", out var outputImage) &&
            outputImage.ValueKind == JsonValueKind.Object)
        {
            var bytes = ReadImageObject(outputImage, out var contentType);
            if (bytes.Length > 0)
                return (bytes, contentType);
        }

        if (root.TryGetProperty("steps", out var steps) &&
            steps.ValueKind == JsonValueKind.Array)
        {
            foreach (var step in steps.EnumerateArray())
            {
                if (!step.TryGetProperty("type", out var stepType) ||
                    !string.Equals(stepType.GetString(), "model_output", StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!step.TryGetProperty("content", out var content) ||
                    content.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var item in content.EnumerateArray())
                {
                    if (!item.TryGetProperty("type", out var itemType) ||
                        !string.Equals(itemType.GetString(), "image", StringComparison.OrdinalIgnoreCase))
                        continue;

                    var bytes = ReadImageObject(item, out var contentType);
                    if (bytes.Length > 0)
                        return (bytes, contentType);
                }
            }
        }

        return (Array.Empty<byte>(), "image/png");
    }

    private static byte[] ReadImageObject(
        JsonElement image,
        out string contentType)
    {
        contentType =
            image.TryGetProperty("mime_type", out var mime) &&
            mime.ValueKind == JsonValueKind.String
                ? mime.GetString() ?? "image/png"
                : "image/png";

        if (!image.TryGetProperty("data", out var data) ||
            data.ValueKind != JsonValueKind.String)
            return Array.Empty<byte>();

        try
        {
            return Convert.FromBase64String(data.GetString() ?? string.Empty);
        }
        catch (FormatException)
        {
            return Array.Empty<byte>();
        }
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
        }

        return responseText.Length > 600
            ? responseText[..600]
            : responseText;
    }
}
