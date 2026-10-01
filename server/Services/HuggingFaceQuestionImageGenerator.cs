using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class HuggingFaceQuestionImageGenerator : IQuestionImageGenerator
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HuggingFaceQuestionImageGenerator> _logger;

    public HuggingFaceQuestionImageGenerator(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<HuggingFaceQuestionImageGenerator> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public static (string Model, string Provider) ResolveConfiguration(IConfiguration configuration)
    {
        var rawModel = (configuration["QUESTION_IMAGE_HF_MODEL"] ?? string.Empty).Trim();
        var rawProvider = (configuration["QUESTION_IMAGE_HF_PROVIDER"] ?? string.Empty).Trim().Trim('/');

        // Keep compatibility with the older Render settings so no manual env-var change is required.
        var legacyModel = string.Equals(
            rawModel,
            "stabilityai/stable-diffusion-3-medium-diffusers",
            StringComparison.OrdinalIgnoreCase);

        var model = string.IsNullOrWhiteSpace(rawModel) || legacyModel
            ? "black-forest-labs/FLUX.1-schnell"
            : rawModel;

        // The old hf-inference route is not the reliable route for this image model.
        // Use fal-ai as the default provider for FLUX.1-schnell. Hugging Face
        // documents FLUX.1-schnell on fal-ai and supports automatic provider
        // selection; the currently configured nscale route may reject this
        // model for the account/route even though nscale supports text-to-image.
        var provider = string.IsNullOrWhiteSpace(rawProvider) ||
                       string.Equals(rawProvider, "hf-inference", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(rawProvider, "nscale", StringComparison.OrdinalIgnoreCase)
            ? "fal-ai"
            : rawProvider;

        return (model, provider);
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var token = (_configuration["QUESTION_IMAGE_HF_TOKEN"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException(
                "لم يتم ضبط QUESTION_IMAGE_HF_TOKEN.");

        var (model, provider) = ResolveConfiguration(_configuration);

        if (!string.Equals(provider, "fal-ai", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"مزود Hugging Face الحالي غير مدعوم في مولد الصور الجديد: {provider}.");
        }

        var client = _httpClientFactory.CreateClient("HuggingFaceImage");
        var providerModel = await ResolveProviderModelAsync(
            client,
            token,
            model,
            provider,
            cancellationToken);

        var encodedProviderModel = EncodePath(providerModel);
        var endpoint =
            $"https://router.huggingface.co/{provider}/{encodedProviderModel}?_subdomain=queue";

        var (positive, _) = QuestionImagePromptBuilder.Build(question);
        var steps = Math.Clamp(
            _configuration.GetValue("QUESTION_IMAGE_STEPS", 4),
            1,
            4);
        var width = _configuration.GetValue("QUESTION_IMAGE_WIDTH", 768);
        var height = _configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512);

        // Hugging Face's Fal adapter flattens text-to-image parameters into
        // Fal's request shape: prompt + image parameters at the top level.
        var payload = new
        {
            prompt = positive,
            width,
            height,
            num_inference_steps = steps
        };

        var started = Stopwatch.GetTimestamp();

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = JsonContent.Create(payload)
            };
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            _logger.LogInformation(
                "Hugging Face Fal image queue response: provider={Provider}, model={Model}, providerModel={ProviderModel}, status={StatusCode}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                (int)response.StatusCode,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"Hugging Face رفض توليد الصورة: HTTP {(int)response.StatusCode} — {TryReadError(body)}");
            }

            using var queueJson = JsonDocument.Parse(body);
            var root = queueJson.RootElement;

            if (!root.TryGetProperty("request_id", out var requestIdElement))
                throw new InvalidOperationException(
                    "Hugging Face/Fal لم يُرجع request_id صالحاً لطلب الصورة.");

            var requestId = requestIdElement.GetString();
            var responseUrl = root.TryGetProperty("response_url", out var responseUrlElement)
                ? responseUrlElement.GetString()
                : null;
            var status = root.TryGetProperty("status", out var statusElement)
                ? statusElement.GetString() ?? "IN_QUEUE"
                : "IN_QUEUE";

            if (string.IsNullOrWhiteSpace(requestId) ||
                string.IsNullOrWhiteSpace(responseUrl))
            {
                throw new InvalidOperationException(
                    "Hugging Face/Fal أعاد استجابة طابور غير مكتملة لطلب الصورة.");
            }

            var initialUri = new Uri(endpoint);
            var responseUri = new Uri(responseUrl);
            var baseUrl = $"{responseUri.Scheme}://{responseUri.Host}";
            if (responseUri.Host.Equals(
                "router.huggingface.co",
                StringComparison.OrdinalIgnoreCase))
            {
                baseUrl += "/fal-ai";
            }

            var modelPath = responseUri.AbsolutePath;
            var queueQuery = initialUri.Query;

            var statusUrl = $"{baseUrl}{modelPath}/status{queueQuery}";
            var resultUrl = $"{baseUrl}{modelPath}{queueQuery}";

            var timeoutSeconds = Math.Clamp(
                _configuration.GetValue("QUESTION_IMAGE_QUEUE_TIMEOUT_SECONDS", 300),
                30,
                900);
            var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);

            while (!string.Equals(status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(status, "FAILED", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(status, "ERROR", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(status, "CANCELED", StringComparison.OrdinalIgnoreCase))
                {
                    var failureBody = await client.GetStringAsync(statusUrl, cancellationToken);
                    throw new InvalidOperationException(
                        $"Fal فشل في توليد الصورة: {TryReadError(failureBody)}");
                }

                if (DateTime.UtcNow >= deadline)
                {
                    throw new TimeoutException(
                        $"انتهت مهلة انتظار Fal لتوليد الصورة بعد {timeoutSeconds} ثانية. request_id={requestId}");
                }

                await Task.Delay(
                    TimeSpan.FromMilliseconds(700),
                    cancellationToken);

                using var statusResponse = await client.GetAsync(
                    statusUrl,
                    cancellationToken);
                var statusBody = await statusResponse.Content.ReadAsStringAsync(cancellationToken);

                if (!statusResponse.IsSuccessStatusCode)
                {
                    throw new HttpRequestException(
                        $"Fal تعذر عليه فحص حالة طلب الصورة: HTTP {(int)statusResponse.StatusCode} — {TryReadError(statusBody)}");
                }

                using var statusJson = JsonDocument.Parse(statusBody);
                status = statusJson.RootElement.TryGetProperty("status", out var currentStatus)
                    ? currentStatus.GetString() ?? status
                    : status;
            }

            using var resultResponse = await client.GetAsync(
                resultUrl,
                cancellationToken);
            var resultBody = await resultResponse.Content.ReadAsStringAsync(cancellationToken);

            if (!resultResponse.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"Fal أكمل الطلب لكنه فشل في جلب النتيجة: HTTP {(int)resultResponse.StatusCode} — {TryReadError(resultBody)}");
            }

            using var resultJson = JsonDocument.Parse(resultBody);
            var images = resultJson.RootElement.TryGetProperty("images", out var imagesElement)
                ? imagesElement
                : default;

            if (images.ValueKind != JsonValueKind.Array || images.GetArrayLength() == 0)
                throw new InvalidOperationException(
                    "Fal أكمل التوليد لكنه لم يُرجع صورة داخل النتيجة.");

            var imageUrl = images[0].TryGetProperty("url", out var imageUrlElement)
                ? imageUrlElement.GetString()
                : null;

            if (string.IsNullOrWhiteSpace(imageUrl))
                throw new InvalidOperationException(
                    "Fal أكمل التوليد لكنه لم يُرجع رابط صورة صالحاً.");

            using var imageResponse = await client.GetAsync(
                imageUrl,
                cancellationToken);
            var imageBytes = await imageResponse.Content.ReadAsByteArrayAsync(cancellationToken);

            if (!imageResponse.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"تعذر تحميل الصورة الناتجة من Fal: HTTP {(int)imageResponse.StatusCode}");
            }

            if (!LooksLikeImage(imageBytes, out var detectedContentType))
            {
                throw new InvalidOperationException(
                    "Fal أعاد نتيجة ناجحة لكن الملف النهائي ليس صورة صالحة.");
            }

            var contentType =
                imageResponse.Content.Headers.ContentType?.MediaType?.Trim();

            if (string.IsNullOrWhiteSpace(contentType) ||
                !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                contentType = detectedContentType;
            }

            _logger.LogInformation(
                "Hugging Face Fal image generation completed: provider={Provider}, model={Model}, providerModel={ProviderModel}, requestId={RequestId}, bytes={Bytes}, contentType={ContentType}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                requestId,
                imageBytes.Length,
                contentType,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);

            return new GeneratedImageResult(imageBytes, contentType);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(
                ex,
                "Hugging Face Fal image generation failed: provider={Provider}, model={Model}, providerModel={ProviderModel}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            throw;
        }
    }

    private static async Task<string> ResolveProviderModelAsync(
        HttpClient client,
        string token,
        string model,
        string provider,
        CancellationToken cancellationToken)
    {
        var modelUrl =
            $"https://huggingface.co/api/models/{EncodePath(model)}?expand=inferenceProviderMapping";

        using var request = new HttpRequestMessage(HttpMethod.Get, modelUrl);
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"تعذر قراءة خريطة مزود Hugging Face للموديل: HTTP {(int)response.StatusCode} — {TryReadError(body)}");
        }

        using var json = JsonDocument.Parse(body);

        if (!json.RootElement.TryGetProperty(
                "inferenceProviderMapping",
                out var mappings) ||
            mappings.ValueKind != JsonValueKind.Object ||
            !mappings.TryGetProperty(provider, out var providerMapping) ||
            providerMapping.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException(
                $"الموديل {model} لا يملك خريطة فعالة للمزود {provider} على Hugging Face.");
        }

        var mappingStatus = providerMapping.TryGetProperty("status", out var status)
            ? status.GetString()
            : null;

        if (!string.Equals(mappingStatus, "live", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"خريطة المزود {provider} للموديل {model} ليست بحالة live حالياً (الحالة: {mappingStatus ?? "غير معروفة"}).");
        }

        var providerId = providerMapping.TryGetProperty("providerId", out var providerIdElement)
            ? providerIdElement.GetString()
            : null;

        if (string.IsNullOrWhiteSpace(providerId))
        {
            throw new InvalidOperationException(
                $"لم تُرجع Hugging Face providerId صالحاً للموديل {model} عبر {provider}.");
        }

        return providerId;
    }

    private static string EncodePath(string value) =>
        string.Join(
            "/",
            value.Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(Uri.EscapeDataString));

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

        if (bytes.Length >= 6 &&
            ((bytes[0] == (byte)'G' && bytes[1] == (byte)'I' && bytes[2] == (byte)'F') &&
             (bytes[3] == (byte)'8' && (bytes[4] == (byte)'7' || bytes[4] == (byte)'9') && bytes[5] == (byte)'a')))
        {
            contentType = "image/gif";
            return true;
        }

        return false;
    }

    private static string TryReadError(byte[] bytes)
    {
        try
        {
            var text = System.Text.Encoding.UTF8.GetString(bytes);

            if (string.IsNullOrWhiteSpace(text))
                return string.Empty;

            if (text.Length > 1200)
                text = text[..1200];

            try
            {
                using var document = JsonDocument.Parse(text);

                if (document.RootElement.ValueKind == JsonValueKind.Object &&
                    document.RootElement.TryGetProperty("error", out var error))
                {
                    return error.GetString() ?? text;
                }
            }
            catch
            {
                // Return plain-text body below.
            }

            return text;
        }
        catch
        {
            return string.Empty;
        }
    }
}
