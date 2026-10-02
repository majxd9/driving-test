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

    public static string ResolveProviderModel(IConfiguration configuration)
    {
        var (model, provider) = ResolveConfiguration(configuration);
        var configured =
            (configuration["QUESTION_IMAGE_HF_PROVIDER_MODEL"] ?? string.Empty).Trim().Trim('/');

        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        if (string.Equals(provider, "fal-ai", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(model, "black-forest-labs/FLUX.1-schnell", StringComparison.OrdinalIgnoreCase))
            return "fal-ai/flux/schnell";

        return model;
    }

    public static string ResolveEndpoint(IConfiguration configuration)
    {
        var (_, provider) = ResolveConfiguration(configuration);
        return $"https://router.huggingface.co/{provider}/{EncodePath(ResolveProviderModel(configuration))}";
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var token = (_configuration["QUESTION_IMAGE_HF_TOKEN"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("لم يتم ضبط QUESTION_IMAGE_HF_TOKEN.");

        var (model, provider) = ResolveConfiguration(_configuration);

        if (!string.Equals(provider, "fal-ai", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"مزود Hugging Face الحالي غير مدعوم في مولد الصور الجديد: {provider}.");

        var providerModel = ResolveProviderModel(_configuration);
        var endpoint = ResolveEndpoint(_configuration);
        var client = _httpClientFactory.CreateClient("HuggingFaceImage");

        var (positive, _) = QuestionImagePromptBuilder.Build(question);
        var steps = Math.Clamp(_configuration.GetValue("QUESTION_IMAGE_STEPS", 4), 1, 4);
        var width = Math.Clamp(_configuration.GetValue("QUESTION_IMAGE_WIDTH", 768), 256, 1536);
        var height = Math.Clamp(_configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512), 256, 1536);

        // Every question gets its own deterministic seed. This prevents different
        // queue jobs from converging on the same provider result and makes retries
        // reproducible for the same question revision.
        var contentHash = QuestionImagePromptBuilder.GetContentHash(question);
        var seed = unchecked((int)Convert.ToUInt32(contentHash[..8], 16));

        var payload = new
        {
            prompt = positive,
            num_inference_steps = steps,
            seed,
            image_size = new { width, height }
        };

        var timeoutSeconds = Math.Clamp(
            _configuration.GetValue("QUESTION_IMAGE_QUEUE_TIMEOUT_SECONDS", 300),
            30,
            900);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

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
                timeout.Token);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(timeout.Token);
                throw new HttpRequestException(
                    $"Hugging Face رفض توليد الصورة: HTTP {(int)response.StatusCode} — {TryReadError(errorText)}");
            }

            var responseContentType =
                response.Content.Headers.ContentType?.MediaType?.Trim();

            // Some Hugging Face text-to-image routes return image bytes directly.
            // Keep that path alongside the existing provider-specific JSON response.
            if (!string.IsNullOrWhiteSpace(responseContentType) &&
                responseContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                var directBytes = await response.Content.ReadAsByteArrayAsync(timeout.Token);

                if (!LooksLikeImage(directBytes, out var directContentType))
                    throw new InvalidOperationException(
                        $"Hugging Face/Fal أعلن أن الاستجابة صورة لكنها لا تحتوي بيانات صورة صالحة. {TryReadError(directBytes)}");

                _logger.LogInformation(
                    "Hugging Face Fal image generation completed with direct image response: provider={Provider}, model={Model}, providerModel={ProviderModel}, bytes={Bytes}, contentType={ContentType}, elapsedMs={ElapsedMs}",
                    provider,
                    model,
                    providerModel,
                    directBytes.Length,
                    directContentType,
                    Stopwatch.GetElapsedTime(started).TotalMilliseconds);

                return new GeneratedImageResult(directBytes, directContentType);
            }

            var responseText = await response.Content.ReadAsStringAsync(timeout.Token);

            string imageUrl;
            string? providerContentType = null;

            try
            {
                using var document = JsonDocument.Parse(responseText);
                var root = document.RootElement;

                if (!root.TryGetProperty("images", out var images) ||
                    images.ValueKind != JsonValueKind.Array ||
                    images.GetArrayLength() == 0)
                {
                    throw new InvalidOperationException(
                        $"Hugging Face/Fal أعاد استجابة ناجحة بدون قائمة صور. {TryReadError(responseText)}");
                }

                var firstImage = images[0];

                if (!firstImage.TryGetProperty("url", out var urlElement) ||
                    string.IsNullOrWhiteSpace(urlElement.GetString()))
                {
                    throw new InvalidOperationException(
                        $"Hugging Face/Fal أعاد نتيجة صورة بدون رابط صالح. {TryReadError(responseText)}");
                }

                imageUrl = urlElement.GetString()!;

                if (firstImage.TryGetProperty("content_type", out var contentTypeElement))
                    providerContentType = contentTypeElement.GetString();
            }
            catch (JsonException ex)
            {
                throw new InvalidOperationException(
                    $"Hugging Face/Fal أعاد استجابة غير مفهومة بدل نتيجة الصورة. {ex.Message}");
            }

            using var imageResponse = await client.GetAsync(
                imageUrl,
                HttpCompletionOption.ResponseHeadersRead,
                timeout.Token);

            var imageBytes = await imageResponse.Content.ReadAsByteArrayAsync(timeout.Token);

            if (!imageResponse.IsSuccessStatusCode)
                throw new HttpRequestException(
                    $"Hugging Face/Fal أعاد رابط صورة غير قابل للتحميل: HTTP {(int)imageResponse.StatusCode}.");

            if (!LooksLikeImage(imageBytes, out var detectedContentType))
                throw new InvalidOperationException(
                    $"Hugging Face/Fal أعاد بيانات ليست صورة صالحة. {TryReadError(imageBytes)}");

            var contentType = providerContentType?.Trim();

            if (string.IsNullOrWhiteSpace(contentType) ||
                !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                contentType = imageResponse.Content.Headers.ContentType?.MediaType?.Trim();

            if (string.IsNullOrWhiteSpace(contentType) ||
                !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                contentType = detectedContentType;

            _logger.LogInformation(
                "Hugging Face Fal image generation completed: provider={Provider}, model={Model}, providerModel={ProviderModel}, bytes={Bytes}, contentType={ContentType}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                imageBytes.Length,
                contentType,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);

            return new GeneratedImageResult(imageBytes, contentType);
        }
        catch (OperationCanceledException) when (
            timeout.IsCancellationRequested &&
            !cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException(
                $"انتهت مهلة انتظار Hugging Face/Fal لتوليد الصورة بعد {timeoutSeconds} ثانية.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(
                ex,
                "Hugging Face Fal image generation failed: provider={Provider}, model={Model}, providerModel={ProviderModel}, endpoint={Endpoint}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                endpoint,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            throw;
        }
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

    private static string TryReadError(string text)
    {
        try
        {
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
                    return error.ValueKind == JsonValueKind.String
                        ? error.GetString() ?? text
                        : error.ToString();
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

    private static string TryReadError(byte[] bytes) =>
        TryReadError(System.Text.Encoding.UTF8.GetString(bytes));
}
