using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class ComfyUiQuestionImageGenerator : IQuestionImageGenerator
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public ComfyUiQuestionImageGenerator(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<GeneratedImageResult> GenerateAsync(Question question, CancellationToken cancellationToken)
    {
        var model = (_configuration["QUESTION_IMAGE_MODEL_FILENAME"] ?? string.Empty).Trim();
        var customWorkflow = (_configuration["QUESTION_IMAGE_WORKFLOW_JSON"] ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(model) && string.IsNullOrWhiteSpace(customWorkflow))
            throw new InvalidOperationException(
                "لم يتم ضبط QUESTION_IMAGE_MODEL_FILENAME لخدمة ComfyUI، ولم يتم توفير QUESTION_IMAGE_WORKFLOW_JSON.");

        var client = _httpClientFactory.CreateClient("ComfyUI");
        var (positive, negative) = QuestionImagePromptBuilder.Build(question);
        var workflow = BuildWorkflow(model, positive, negative);

        using var response = await client.PostAsJsonAsync("/prompt", new { prompt = workflow }, cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"ComfyUI رفض الـworkflow: HTTP {(int)response.StatusCode} — " +
                await response.Content.ReadAsStringAsync(cancellationToken));

        var queued = await response.Content.ReadFromJsonAsync<ComfyPromptResponse>(
            cancellationToken: cancellationToken);

        if (string.IsNullOrWhiteSpace(queued?.PromptId))
            throw new InvalidOperationException("ComfyUI لم يعِد prompt_id.");

        var timeoutSeconds = _configuration.GetValue("QUESTION_IMAGE_TIMEOUT_SECONDS", 1800);
        var pollMs = _configuration.GetValue("QUESTION_IMAGE_POLL_MS", 2000);
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);

        while (DateTime.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(pollMs, cancellationToken);

            using var historyResponse = await client.GetAsync(
                $"/history/{Uri.EscapeDataString(queued.PromptId)}",
                cancellationToken);

            if (!historyResponse.IsSuccessStatusCode)
                continue;

            using var document = JsonDocument.Parse(
                await historyResponse.Content.ReadAsStringAsync(cancellationToken));

            if (!document.RootElement.TryGetProperty(queued.PromptId, out var historyItem))
                continue;

            if (historyItem.TryGetProperty("status", out var status) &&
                status.TryGetProperty("status_str", out var statusString) &&
                string.Equals(statusString.GetString(), "error", StringComparison.OrdinalIgnoreCase))
            {
                var detail = status.TryGetProperty("messages", out var messages)
                    ? messages.ToString()
                    : string.Empty;

                throw new InvalidOperationException(
                    $"ComfyUI فشل في تنفيذ الـworkflow. {detail}".Trim());
            }

            if (!historyItem.TryGetProperty("outputs", out var outputs))
                continue;

            foreach (var output in outputs.EnumerateObject())
            {
                if (!output.Value.TryGetProperty("images", out var images))
                    continue;

                foreach (var image in images.EnumerateArray())
                {
                    var filename = image.TryGetProperty("filename", out var fn)
                        ? fn.GetString()
                        : null;

                    if (string.IsNullOrWhiteSpace(filename))
                        continue;

                    var subfolder = image.TryGetProperty("subfolder", out var sf)
                        ? sf.GetString()
                        : string.Empty;

                    var type = image.TryGetProperty("type", out var ty)
                        ? ty.GetString()
                        : "output";

                    var viewUrl =
                        $"/view?filename={Uri.EscapeDataString(filename)}" +
                        $"&subfolder={Uri.EscapeDataString(subfolder ?? string.Empty)}" +
                        $"&type={Uri.EscapeDataString(type ?? "output")}";

                    var bytes = await client.GetByteArrayAsync(viewUrl, cancellationToken);

                    if (bytes.Length == 0)
                        throw new InvalidOperationException("ComfyUI أعاد ملف صورة فارغاً.");

                    return new GeneratedImageResult(bytes, GuessContentType(filename));
                }
            }
        }

        throw new TimeoutException($"انتهت مهلة انتظار ComfyUI ({timeoutSeconds} ثانية).");
    }

    private JsonObject BuildWorkflow(string model, string positive, string negative)
    {
        var custom = _configuration["QUESTION_IMAGE_WORKFLOW_JSON"];

        var workflow = !string.IsNullOrWhiteSpace(custom)
            ? JsonNode.Parse(custom)!.AsObject()
            : JsonNode.Parse($@"{{
                ""3"": {{
                    ""class_type"": ""KSampler"",
                    ""inputs"": {{
                        ""cfg"": {_configuration.GetValue("QUESTION_IMAGE_CFG", 7.0).ToString(System.Globalization.CultureInfo.InvariantCulture)},
                        ""denoise"": 1,
                        ""latent_image"": [""5"", 0],
                        ""model"": [""4"", 0],
                        ""negative"": [""7"", 0],
                        ""positive"": [""6"", 0],
                        ""sampler_name"": ""euler"",
                        ""scheduler"": ""normal"",
                        ""seed"": {Random.Shared.NextInt64(1, int.MaxValue)},
                        ""steps"": {_configuration.GetValue("QUESTION_IMAGE_STEPS", 24)}
                    }}
                }},
                ""4"": {{
                    ""class_type"": ""CheckpointLoaderSimple"",
                    ""inputs"": {{ ""ckpt_name"": {JsonSerializer.Serialize(model)} }}
                }},
                ""5"": {{
                    ""class_type"": ""EmptyLatentImage"",
                    ""inputs"": {{
                        ""batch_size"": 1,
                        ""height"": {_configuration.GetValue("QUESTION_IMAGE_HEIGHT", 512)},
                        ""width"": {_configuration.GetValue("QUESTION_IMAGE_WIDTH", 768)}
                    }}
                }},
                ""6"": {{
                    ""class_type"": ""CLIPTextEncode"",
                    ""inputs"": {{ ""clip"": [""4"", 1], ""text"": {JsonSerializer.Serialize(positive)} }}
                }},
                ""7"": {{
                    ""class_type"": ""CLIPTextEncode"",
                    ""inputs"": {{ ""clip"": [""4"", 1], ""text"": {JsonSerializer.Serialize(negative)} }}
                }},
                ""8"": {{
                    ""class_type"": ""VAEDecode"",
                    ""inputs"": {{ ""samples"": [""3"", 0], ""vae"": [""4"", 2] }}
                }},
                ""9"": {{
                    ""class_type"": ""SaveImage"",
                    ""inputs"": {{ ""filename_prefix"": ""rukhsati_question"", ""images"": [""8"", 0] }}
                }}
            }}")!.AsObject();

        SetNodeInput(
            workflow,
            _configuration["QUESTION_IMAGE_PROMPT_NODE_ID"] ?? "6",
            _configuration["QUESTION_IMAGE_PROMPT_FIELD"] ?? "text",
            positive);

        SetNodeInput(
            workflow,
            _configuration["QUESTION_IMAGE_NEGATIVE_NODE_ID"] ?? "7",
            _configuration["QUESTION_IMAGE_NEGATIVE_FIELD"] ?? "text",
            negative);

        return workflow;
    }

    private static void SetNodeInput(JsonObject workflow, string nodeId, string field, string value)
    {
        if (workflow[nodeId] is not JsonObject node ||
            node["inputs"] is not JsonObject inputs)
            throw new InvalidOperationException(
                $"ComfyUI workflow لا يحتوي على العقدة {nodeId} أو inputs.");

        inputs[field] = value;
    }

    private static string GuessContentType(string filename)
    {
        var ext = Path.GetExtension(filename);

        return ext.Equals(".webp", StringComparison.OrdinalIgnoreCase)
            ? "image/webp"
            : ext.Equals(".jpg", StringComparison.OrdinalIgnoreCase) ||
              ext.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
                ? "image/jpeg"
                : "image/png";
    }

    private sealed record ComfyPromptResponse(
        [property: JsonPropertyName("prompt_id")] string PromptId);
}