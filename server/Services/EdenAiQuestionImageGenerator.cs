using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class EdenAiQuestionImageGenerator : IQuestionImageGenerator
{
    private const string Endpoint = "v2/image/generation";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EdenAiQuestionImageGenerator> _logger;

    public EdenAiQuestionImageGenerator(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<EdenAiQuestionImageGenerator> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var apiKey = (_configuration["EDENAI_API_KEY"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("لم يتم ضبط EDENAI_API_KEY.");

        var primaryProvider = GetRequiredProvider("EDENAI_IMAGE_PROVIDER");
        var fallbackProviders = GetProviderList("EDENAI_IMAGE_FALLBACK_PROVIDERS");

        var (positive, _) = QuestionImagePromptBuilder.Build(question);
        var width = Math.Clamp(_configuration.GetValue("QUESTION_IMAGE_WIDTH", 768), 256, 1536);
        var height = Math.Clamp(_configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512), 256, 1536);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(
            Math.Clamp(_configuration.GetValue("QUESTION_IMAGE_QUEUE_TIMEOUT_SECONDS", 600), 30, 1200)));

        var client = _httpClientFactory.CreateClient("EdenAI");
        using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = JsonContent.Create(new
            {
                response_as_dict = true,
                attributes_as_list = false,
                show_original_response = false,
                providers = primaryProvider,
                fallback_providers = string.Join(",", fallbackProviders),
                text = positive,
                resolution = $"{width}x{height}",
                num_images = 1
            })
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
                $"Eden AI رفض توليد الصورة: HTTP {(int)response.StatusCode} — {Truncate(body)}");

        using var document = JsonDocument.Parse(body);
        var imageUrl = FindFirstImageUrl(document.RootElement);

        if (string.IsNullOrWhiteSpace(imageUrl))
            throw new InvalidOperationException(
                $"Eden AI لم يُرجع صورة فعلية. المزود الأساسي: {primaryProvider}. التفاصيل: {Truncate(body)}");

        if (TryDecodeDataUrl(imageUrl, out var inlineBytes, out var inlineContentType))
            return new GeneratedImageResult(inlineBytes, inlineContentType);

        using var imageResponse = await client.GetAsync(imageUrl, timeout.Token);
        if (!imageResponse.IsSuccessStatusCode)
        {
            var error = await imageResponse.Content.ReadAsStringAsync(timeout.Token);
            throw new HttpRequestException(
                $"Eden AI أعاد رابط صورة غير قابل للتنزيل: HTTP {(int)imageResponse.StatusCode} — {Truncate(error)}");
        }

        var bytes = await imageResponse.Content.ReadAsByteArrayAsync(timeout.Token);
        if (bytes.Length == 0)
            throw new InvalidOperationException("Eden AI أعاد ملف صورة فارغاً.");

        var contentType =
            imageResponse.Content.Headers.ContentType?.MediaType?.Trim() ??
            GuessImageContentType(imageUrl);

        _logger.LogInformation(
            "Eden AI image generation succeeded using primary {PrimaryProvider} with {FallbackCount} fallback providers.",
            primaryProvider,
            fallbackProviders.Count);

        return new GeneratedImageResult(bytes, contentType);
    }

    private string GetRequiredProvider(string key)
    {
        var provider = (_configuration[key] ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(provider))
            throw new InvalidOperationException(
                $"لم يتم ضبط {key} لخدمة Eden AI.");

        return provider;
    }

    private List<string> GetProviderList(string key) =>
        (_configuration[key] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToLowerInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Take(5)
            .ToList();

    private static string? FindFirstBase64(JsonElement node)
    {
        if (node.ValueKind == JsonValueKind.Object)
        {
            foreach (var name in new[] { "image", "base64", "image_base64" })
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

    private static string? FindFirstImageUrl(JsonElement node)
    {
        if (node.ValueKind == JsonValueKind.Object)
        {
            if (node.TryGetProperty("status", out var status) &&
                status.ValueKind == JsonValueKind.String &&
                string.Equals(status.GetString(), "fail", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            foreach (var name in new[] { "image_resource_url", "image_url", "url" })
            {
                if (node.TryGetProperty(name, out var value) &&
                    value.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(value.GetString()))
                    return value.GetString();
            }

            foreach (var property in node.EnumerateObject())
            {
                var found = FindFirstImageUrl(property.Value);
                if (!string.IsNullOrWhiteSpace(found))
                    return found;
            }
        }
        else if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
            {
                var found = FindFirstImageUrl(item);
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
        contentType = "image/png";

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

    private static string GuessImageContentType(string value)
    {
        var lower = value.ToLowerInvariant();
        if (lower.Contains(".webp"))
            return "image/webp";
        if (lower.Contains(".jpg") || lower.Contains(".jpeg"))
            return "image/jpeg";
        return "image/png";
    }

    private static string Truncate(string value) =>
        value.Length > 1200 ? value[..1200] : value;
}
