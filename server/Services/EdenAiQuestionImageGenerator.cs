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

    public Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken) =>
        GenerateAsync(question, cancellationToken, allowInternalFallback: true);

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken,
        bool allowInternalFallback)
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
                fallback_providers = allowInternalFallback
                    ? string.Join(",", fallbackProviders)
                    : string.Empty,
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

        // Eden returns one provider object per requested provider. Restrict
        // extraction to the configured provider so an unrelated nested image
        // can never be mistaken for the generated result.
        if (TryExtractProviderImage(
            document.RootElement,
            primaryProvider,
            out var generatedBytes,
            out var generatedContentType,
            out var generatedUrl,
            out var providerError))
        {
            if (generatedBytes is not null)
                return new GeneratedImageResult(generatedBytes, generatedContentType);

            if (!string.IsNullOrWhiteSpace(generatedUrl))
                return await DownloadImageAsync(
                    client,
                    generatedUrl,
                    apiKey,
                    timeout.Token,
                    primaryProvider);
        }

        if (!allowInternalFallback)
            throw new InvalidOperationException(
                $"Eden AI لم يُرجع صورة صالحة من المزود المحدد فقط ({primaryProvider}). {providerError}");

        foreach (var fallbackProvider in fallbackProviders)
        {
            if (!TryExtractProviderImage(
                document.RootElement,
                fallbackProvider,
                out var fallbackBytes,
                out var fallbackContentType,
                out var fallbackUrl,
                out _))
                continue;

            if (fallbackBytes is not null)
            {
                _logger.LogWarning(
                    "Eden AI fallback provider {FallbackProvider} supplied the image after primary {PrimaryProvider} failed.",
                    fallbackProvider,
                    primaryProvider);
                return new GeneratedImageResult(fallbackBytes, fallbackContentType);
            }

            if (!string.IsNullOrWhiteSpace(fallbackUrl))
            {
                _logger.LogWarning(
                    "Eden AI fallback provider {FallbackProvider} supplied the image URL after primary {PrimaryProvider} failed.",
                    fallbackProvider,
                    primaryProvider);
                return await DownloadImageAsync(
                    client,
                    fallbackUrl,
                    apiKey,
                    timeout.Token,
                    fallbackProvider);
            }
        }

        throw new InvalidOperationException(
            $"Eden AI لم يُرجع صورة فعلية. المزود الأساسي: {primaryProvider}. التفاصيل: {Truncate(body)}");
    }

    private static bool TryExtractProviderImage(
        JsonElement root,
        string provider,
        out byte[]? bytes,
        out string contentType,
        out string? resourceUrl,
        out string error)
    {
        bytes = null;
        contentType = "image/png";
        resourceUrl = null;
        error = string.Empty;

        if (!TryGetProviderNode(root, provider, out var providerNode))
        {
            error = $"استجابة المزود المحدد غير موجودة. {DescribeResponseRoot(root)}";
            return false;
        }

        if (TryGetPropertyIgnoreCase(providerNode, "status", out var status) &&
            status.ValueKind == JsonValueKind.String &&
            string.Equals(status.GetString(), "fail", StringComparison.OrdinalIgnoreCase))
        {
            error = $"المزود أعاد حالة fail: {providerNode}";
            return false;
        }

        if (!TryGetPropertyIgnoreCase(providerNode, "items", out var items) ||
            items.ValueKind != JsonValueKind.Array)
        {
            error = "استجابة المزود لا تحتوي items.";
            return false;
        }

        foreach (var item in items.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
                continue;

            foreach (var name in new[] { "image", "image_base64", "base64" })
            {
                if (!TryGetPropertyIgnoreCase(item, name, out var value) ||
                    value.ValueKind != JsonValueKind.String)
                    continue;

                var raw = value.GetString();
                if (string.IsNullOrWhiteSpace(raw))
                    continue;

                try
                {
                    var decoded = Convert.FromBase64String(raw);
                    if (LooksLikeImage(decoded, out var decodedType))
                    {
                        bytes = decoded;
                        contentType = decodedType;
                        return true;
                    }
                }
                catch (FormatException)
                {
                    error = "حقل الصورة المضمّنة ليس Base64 صالحاً.";
                }
            }

            foreach (var name in new[] { "image_resource_url", "image_url", "url" })
            {
                if (!TryGetPropertyIgnoreCase(item, name, out var value) ||
                    value.ValueKind != JsonValueKind.String)
                    continue;

                var raw = value.GetString();
                if (!string.IsNullOrWhiteSpace(raw))
                {
                    resourceUrl = raw;
                    return true;
                }
            }
        }

        error = "لم نجد صورة داخل items للمزود المحدد.";
        return false;
    }

    private static string DescribeResponseRoot(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            return $"نوع استجابة Eden AI: {root.ValueKind}.";

        var keys = root.EnumerateObject()
            .Select(x => x.Name)
            .Take(20)
            .ToArray();

        return keys.Length == 0
            ? "استجابة Eden AI فارغة من الخصائص."
            : $"مفاتيح استجابة Eden AI: {string.Join(", ", keys)}.";
    }

    private static bool TryGetProviderNode(
        JsonElement root,
        string provider,
        out JsonElement providerNode)
    {
        // Eden may key the response by the exact configured provider
        // ("openai") or by provider/model ("openai/gpt-image-1.5").
        if (TryGetPropertyIgnoreCase(root, provider, out providerNode) &&
            providerNode.ValueKind == JsonValueKind.Object)
            return true;

        if (root.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in root.EnumerateObject())
            {
                if (property.Value.ValueKind != JsonValueKind.Object)
                    continue;

                if (string.Equals(property.Name, provider, StringComparison.OrdinalIgnoreCase) ||
                    property.Name.StartsWith(provider + "/", StringComparison.OrdinalIgnoreCase))
                {
                    providerNode = property.Value;
                    return true;
                }
            }
        }

        providerNode = default;
        return false;
    }

    private static bool TryGetPropertyIgnoreCase(
        JsonElement node,
        string name,
        out JsonElement value)
    {
        if (node.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in node.EnumerateObject())
            {
                if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }
        }

        value = default;
        return false;
    }

    private static async Task<GeneratedImageResult> DownloadImageAsync(
        HttpClient client,
        string imageUrl,
        string apiKey,
        CancellationToken cancellationToken,
        string provider)
    {
        if (TryDecodeDataUrl(imageUrl, out var inlineBytes, out var inlineContentType))
            return new GeneratedImageResult(inlineBytes, inlineContentType);

        using var imageRequest = new HttpRequestMessage(HttpMethod.Get, imageUrl);
        if (TryGetEdenHost(imageUrl, out _))
            imageRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var imageResponse = await client.SendAsync(
            imageRequest,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        if (!imageResponse.IsSuccessStatusCode)
        {
            var error = await imageResponse.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Eden AI أعاد رابط صورة غير قابل للتنزيل من {provider}: HTTP {(int)imageResponse.StatusCode} — {Truncate(error)}");
        }

        var bytes = await imageResponse.Content.ReadAsByteArrayAsync(cancellationToken);
        if (bytes.Length == 0)
            throw new InvalidOperationException($"Eden AI أعاد ملف صورة فارغاً من {provider}.");

        if (!LooksLikeImage(bytes, out var detectedType))
            throw new InvalidOperationException($"Eden AI أعاد ملفاً غير صوري من {provider}.");

        return new GeneratedImageResult(
            bytes,
            detectedType);
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

    private static bool TryGetEdenHost(string value, out Uri uri)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out uri!))
            return false;

        return string.Equals(uri.Host, "api.edenai.run", StringComparison.OrdinalIgnoreCase)
            || uri.Host.EndsWith(".edenai.run", StringComparison.OrdinalIgnoreCase);
    }

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

    private static bool LooksLikeImage(byte[] bytes, out string contentType)
    {
        contentType = "image/png";

        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 && bytes[1] == 0x50 &&
            bytes[2] == 0x4E && bytes[3] == 0x47 &&
            bytes[4] == 0x0D && bytes[5] == 0x0A &&
            bytes[6] == 0x1A && bytes[7] == 0x0A)
        {
            contentType = "image/png";
            return true;
        }

        if (bytes.Length >= 3 &&
            bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            contentType = "image/jpeg";
            return true;
        }

        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 &&
            bytes[2] == 0x46 && bytes[3] == 0x46 &&
            bytes[8] == 0x57 && bytes[9] == 0x45 &&
            bytes[10] == 0x42 && bytes[11] == 0x50)
        {
            contentType = "image/webp";
            return true;
        }

        return false;
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
