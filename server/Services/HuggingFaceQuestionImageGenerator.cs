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
        // Nscale is a currently documented text-to-image Inference Provider for FLUX.1-schnell.
        var provider = string.IsNullOrWhiteSpace(rawProvider) ||
                       string.Equals(rawProvider, "hf-inference", StringComparison.OrdinalIgnoreCase)
            ? "nscale"
            : rawProvider;

        return (model, provider);
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var token = _configuration["QUESTION_IMAGE_HF_TOKEN"];
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException(
                "لم يتم ضبط QUESTION_IMAGE_HF_TOKEN.");

        var (model, provider) = ResolveConfiguration(_configuration);

        var modelPath = string.Join(
            "/",
            model.Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(Uri.EscapeDataString));

        var endpoint =
            $"https://router.huggingface.co/{provider}/models/{modelPath}";

        var (positive, negative) = QuestionImagePromptBuilder.Build(question);
        var steps = _configuration.GetValue("QUESTION_IMAGE_STEPS", 4);
        var guidance = _configuration.GetValue("QUESTION_IMAGE_CFG", 0.0);

        if (string.Equals(model, "black-forest-labs/FLUX.1-schnell", StringComparison.OrdinalIgnoreCase))
        {
            steps = Math.Clamp(steps, 1, 4);
            guidance = 0.0;
        }

        var width = _configuration.GetValue("QUESTION_IMAGE_WIDTH", 768);
        var height = _configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512);

        // FLUX.1-schnell on Nscale is distilled for a 4-step generation.
        // Keep the request minimal for maximum provider compatibility: some
        // providers/models do not accept negative prompts or guidance_scale.
        object parameters = string.Equals(
            model,
            "black-forest-labs/FLUX.1-schnell",
            StringComparison.OrdinalIgnoreCase)
            ? new
            {
                width,
                height,
                num_inference_steps = steps
            }
            : new
            {
                negative_prompt = negative,
                width,
                height,
                num_inference_steps = steps,
                guidance_scale = guidance
            };

        var payload = new
        {
            inputs = positive,
            parameters
        };

        var client = _httpClientFactory.CreateClient("HuggingFaceImage");
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(payload)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("image/*"));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/octet-stream"));

        var started = Stopwatch.GetTimestamp();

        try
        {
            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            var contentType = response.Content.Headers.ContentType?.MediaType?.Trim();

            _logger.LogInformation(
                "Hugging Face image generation response: provider={Provider}, model={Model}, status={StatusCode}, contentType={ContentType}, bytes={Bytes}, elapsedMs={ElapsedMs}",
                provider,
                model,
                (int)response.StatusCode,
                contentType ?? "<none>",
                bytes.Length,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);

            if (!response.IsSuccessStatusCode)
            {
                var details = TryReadError(bytes);
                throw new HttpRequestException(
                    $"Hugging Face رفض توليد الصورة: HTTP {(int)response.StatusCode}" +
                    (string.IsNullOrWhiteSpace(details) ? "." : $" — {details}"));
            }

            if (bytes.Length == 0)
                throw new InvalidOperationException(
                    "Hugging Face أعاد ملف صورة فارغاً.");

            if (!LooksLikeImage(bytes, out var detectedContentType))
            {
                var details = TryReadError(bytes);

                throw new InvalidOperationException(
                    "Hugging Face أعاد استجابة ناجحة لكنها ليست ملف صورة صالحاً." +
                    (string.IsNullOrWhiteSpace(details) ? string.Empty : $" {details}"));
            }

            if (string.IsNullOrWhiteSpace(contentType) ||
                !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                contentType = detectedContentType;
            }

            return new GeneratedImageResult(bytes, contentType);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(
                ex,
                "Hugging Face image generation failed: provider={Provider}, model={Model}, elapsedMs={ElapsedMs}",
                provider,
                model,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            throw;
        }
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
