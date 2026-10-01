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

        // Use Hugging Face’s documented Inference Providers text-to-image endpoint.
        // The response is the generated image bytes directly; no queue/status protocol is needed.
        var endpoint =
            $"https://router.huggingface.co/{provider}/{EncodePath(providerModel)}";

        var (positive, _) = QuestionImagePromptBuilder.Build(question);
        var steps = Math.Clamp(
            _configuration.GetValue("QUESTION_IMAGE_STEPS", 4),
            1,
            4);
        var width = Math.Clamp(
            _configuration.GetValue("QUESTION_IMAGE_WIDTH", 768),
            256,
            1536);
        var height = Math.Clamp(
            _configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512),
            256,
            1536);

        var payload = new
        {
            inputs = positive,
            parameters = new
            {
                num_inference_steps = steps,
                width,
                height
            }
        };

        var timeoutSeconds = Math.Clamp(
            _configuration.GetValue("QUESTION_IMAGE_QUEUE_TIMEOUT_SECONDS", 300),
            30,
            900);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken);
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
                new MediaTypeWithQualityHeaderValue("image/*"));
            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                timeout.Token);

            var body = await response.Content.ReadAsByteArrayAsync(timeout.Token);

            _logger.LogInformation(
                "Hugging Face Inference image response: provider={Provider}, model={Model}, providerModel={ProviderModel}, status={StatusCode}, contentType={ContentType}, bytes={Bytes}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                (int)response.StatusCode,
                response.Content.Headers.ContentType?.MediaType,
                body.Length,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"Hugging Face رفض توليد الصورة: HTTP {(int)response.StatusCode} — {TryReadError(body)}");
            }

            if (!LooksLikeImage(body, out var detectedContentType))
            {
                throw new InvalidOperationException(
                    $"Hugging Face أعاد استجابة ناجحة لكنها ليست صورة صالحة. {TryReadError(body)}");
            }

            var contentType =
                response.Content.Headers.ContentType?.MediaType?.Trim();

            if (string.IsNullOrWhiteSpace(contentType) ||
                !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                contentType = detectedContentType;
            }

            _logger.LogInformation(
                "Hugging Face image generation completed: provider={Provider}, model={Model}, providerModel={ProviderModel}, bytes={Bytes}, contentType={ContentType}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                body.Length,
                contentType,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);

            return new GeneratedImageResult(body, contentType);
        }
        catch (OperationCanceledException) when (
            timeout.IsCancellationRequested &&
            !cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException(
                $"انتهت مهلة انتظار Hugging Face لتوليد الصورة بعد {timeoutSeconds} ثانية.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(
                ex,
                "Hugging Face image generation failed: provider={Provider}, model={Model}, providerModel={ProviderModel}, endpoint={Endpoint}, elapsedMs={ElapsedMs}",
                provider,
                model,
                providerModel,
                endpoint,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            throw;
        }
    }

    private static Task<string> ResolveProviderModelAsync(
        HttpClient client,
        string token,
        string model,
        string provider,
        CancellationToken cancellationToken)
    {
        // Hugging Face's official Fal text-to-image integration accepts the
        // Hub model id directly. The provider-specific mapping is optional
        // metadata and can be absent from the model-info response even when
        // the provider is serving the model.
        if (!string.Equals(provider, "fal-ai", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"مزود الصور غير مدعوم: {provider}.");
        }

        return Task.FromResult(model);
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
