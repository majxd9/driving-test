using System.Text.Json;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

public sealed record BulkGenerationRequest(bool RetryFailed = false, bool RegenerateCompleted = false);

public sealed record ImageProviderTestResult(string Provider, string State, string Message, string Endpoint);

[ApiController]
[Route("api/admin/ai-generation")]
[Authorize(Roles = "Admin")]
public sealed class AiGenerationAdminController : ControllerBase
{
    private readonly AiGenerationJobService _jobs;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public AiGenerationAdminController(
        AiGenerationJobService jobs,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _jobs = jobs;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpGet("status")]
    public async Task<ActionResult<AiGenerationOverview>> Status(CancellationToken cancellationToken) =>
        Ok(await _jobs.GetOverviewAsync(cancellationToken));

    [HttpPost("audio")]
    public async Task<ActionResult<AiGenerationEnqueueResult>> Audio(
        [FromBody] BulkGenerationRequest? request,
        CancellationToken cancellationToken) =>
        Ok(await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.Audio,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken));

    [HttpPost("image")]
    public async Task<ActionResult<AiGenerationEnqueueResult>> Image(
        [FromBody] BulkGenerationRequest? request,
        CancellationToken cancellationToken) =>
        Ok(await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.AiImage,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken));

    [HttpPost("all")]
    public async Task<ActionResult<object>> All(
        [FromBody] BulkGenerationRequest? request,
        CancellationToken cancellationToken)
    {
        var audio = await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.Audio,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken);

        var image = await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.AiImage,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken);

        return Ok(new { audio, image });
    }

    [HttpPost("resume")]
    public async Task<ActionResult<AiGenerationOverview>> Resume(
        CancellationToken cancellationToken)
    {
        await _jobs.ResetStaleProcessingAsync(cancellationToken);
        await _jobs.ResumePendingAsync(cancellationToken);
        await _jobs.EnqueueMissingAsync(cancellationToken);
        return Ok(await _jobs.GetOverviewAsync(cancellationToken));
    }

    [HttpPost("test-image-provider")]
    public async Task<IActionResult> TestImageProvider(CancellationToken cancellationToken)
    {
        var provider = (_configuration["QUESTION_IMAGE_PROVIDER"] ?? "none").Trim().ToLowerInvariant();
        var endpoint = (_configuration["QUESTION_IMAGE_COMFYUI_URL"] ?? string.Empty).Trim();

        if (provider == "none")
            return Ok(new ImageProviderTestResult(provider, "disabled", "مولد الصور غير مفعّل حالياً. فعّل QUESTION_IMAGE_PROVIDER أولاً.", endpoint));

        if (provider == "huggingface")
        {
            var token = (_configuration["QUESTION_IMAGE_HF_TOKEN"] ?? string.Empty).Trim();
            var (model, hfProvider) = HuggingFaceQuestionImageGenerator.ResolveConfiguration(_configuration);
            var route = HuggingFaceQuestionImageGenerator.ResolveEndpoint(_configuration);

            if (string.IsNullOrWhiteSpace(token))
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "unconfigured",
                    "يجب ضبط QUESTION_IMAGE_HF_TOKEN.",
                    route));
            }

            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(6));

                using var client = _httpClientFactory.CreateClient("HuggingFaceImage");

                // Validate the model against Hugging Face's authoritative provider filter.
                // This avoids relying on the optional inferenceProviderMapping field,
                // which may be missing even when Fal currently serves the model.
                var catalogUrl =
                    $"https://huggingface.co/api/models?inference_provider={Uri.EscapeDataString(hfProvider)}&pipeline_tag=text-to-image&search={Uri.EscapeDataString(model)}&limit=20";

                using var request = new HttpRequestMessage(HttpMethod.Get, catalogUrl);
                request.Headers.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                using var response = await client.SendAsync(request, timeout.Token);

                var details = await response.Content.ReadAsStringAsync(timeout.Token);
                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new ImageProviderTestResult(
                        provider,
                        "error",
                        $"فشل التحقق من Hugging Face: HTTP {(int)response.StatusCode}. {Truncate(details)}",
                        route));
                }

                using var catalogJson = JsonDocument.Parse(details);
                var modelFound = catalogJson.RootElement.ValueKind == JsonValueKind.Array &&
                    catalogJson.RootElement.EnumerateArray().Any(item =>
                        item.TryGetProperty("id", out var idElement) &&
                        string.Equals(
                            idElement.GetString(),
                            model,
                            StringComparison.OrdinalIgnoreCase));


                if (!modelFound)
                {
                    return Ok(new ImageProviderTestResult(
                        provider,
                        "error",
                        $"الموديل {model} لم يظهر ضمن موديلات text-to-image المتاحة عبر {hfProvider} حالياً.",
                        route));
                }

                return Ok(new ImageProviderTestResult(
                    provider,
                    "connected",
                    $"الموديل {model} مُدرج حالياً عبر {hfProvider}. مسار التنفيذ الفعلي يستخدم معرّف Fal الخاص بالموديل.",
                    route));
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    "انتهت مهلة فحص Hugging Face قبل اكتمال التحقق.",
                    route));
            }
            catch (Exception ex)
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    $"تعذر فحص Hugging Face: {ex.Message}",
                    route));
            }
        }

        return Ok(new ImageProviderTestResult(
            provider,
            "unsupported",
            $"مزود الصور '{provider}' غير مدعوم.",
            endpoint));
    }

    private static string Truncate(string value) =>
        value.Length > 600 ? value[..600] : value;
    [HttpGet("completed-images")]
    public async Task<ActionResult<IReadOnlyList<CompletedAiImageItem>>> CompletedImages(
        [FromQuery] int limit = 24,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 60);

        var rows = await _jobs.GetCompletedAiImagesAsync(limit, cancellationToken);
        return Ok(rows);
    }

    public sealed record CompletedAiImageItem(
        int QuestionId,
        string QuestionText,
        string Category,
        string ImageUrl,
        string ContentHash,
        DateTime CreatedAt);

}
