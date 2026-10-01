using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class HuggingFaceQuestionImageGenerator : IQuestionImageGenerator
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public HuggingFaceQuestionImageGenerator(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<GeneratedImageResult> GenerateAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var token = _configuration["QUESTION_IMAGE_HF_TOKEN"];
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException(
                "لم يتم ضبط QUESTION_IMAGE_HF_TOKEN.");

        var model = (_configuration["QUESTION_IMAGE_HF_MODEL"]
            ?? "Qwen/Qwen-Image").Trim();

        if (string.IsNullOrWhiteSpace(model))
            throw new InvalidOperationException(
                "لم يتم ضبط QUESTION_IMAGE_HF_MODEL.");

        var provider = (_configuration["QUESTION_IMAGE_HF_PROVIDER"]
            ?? "hf-inference").Trim().Trim('/');

        if (string.IsNullOrWhiteSpace(provider))
            provider = "hf-inference";

        var modelPath = string.Join(
            "/",
            model.Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(Uri.EscapeDataString));

        var endpoint =
            $"https://router.huggingface.co/{provider}/models/{modelPath}";

        var (positive, negative) = QuestionImagePromptBuilder.Build(question);

        var payload = new
        {
            inputs = positive,
            parameters = new
            {
                negative_prompt = negative,
                width = _configuration.GetValue("QUESTION_IMAGE_WIDTH", 768),
                height = _configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512),
                num_inference_steps = _configuration.GetValue("QUESTION_IMAGE_STEPS", 24),
                guidance_scale = _configuration.GetValue("QUESTION_IMAGE_CFG", 7.0)
            }
        };

        var client = _httpClientFactory.CreateClient("HuggingFaceImage");
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(payload)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("image/png"));

        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

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

        var contentType =
            response.Content.Headers.ContentType?.MediaType?.Trim();

        if (string.IsNullOrWhiteSpace(contentType) ||
            !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            var details = TryReadError(bytes);

            throw new InvalidOperationException(
                "Hugging Face لم يُرجع صورة فعلية." +
                (string.IsNullOrWhiteSpace(details) ? string.Empty : $" {details}"));
        }

        return new GeneratedImageResult(bytes, contentType);
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
