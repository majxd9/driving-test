using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

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

        if (provider != "comfyui")
            return Ok(new ImageProviderTestResult(provider, "unsupported", "مزود الصور مضبوط على قيمة غير مدعومة حالياً.", endpoint));

        if (string.IsNullOrWhiteSpace(endpoint))
            return Ok(new ImageProviderTestResult(provider, "unconfigured", "لم يتم ضبط عنوان ComfyUI.", endpoint));

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(6));

            var client = _httpClientFactory.CreateClient("ComfyUI");
            using var response = await client.GetAsync("/system_stats", timeout.Token);

            if (!response.IsSuccessStatusCode)
            {
                var details = await response.Content.ReadAsStringAsync(timeout.Token);
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    $"ComfyUI متاح لكنه أعاد HTTP {(int)response.StatusCode}. {Truncate(details)}",
                    endpoint));
            }

            return Ok(new ImageProviderTestResult(
                provider,
                "connected",
                "اتصال ComfyUI ناجح والخدمة تستجيب بشكل طبيعي.",
                endpoint));
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Ok(new ImageProviderTestResult(
                provider,
                "timeout",
                "انتهت مهلة الاتصال بـ ComfyUI. إذا كان العنوان 127.0.0.1 أو localhost داخل Render فلن يشير إلى جهازك المحلي.",
                endpoint));
        }
        catch (Exception ex)
        {
            return Ok(new ImageProviderTestResult(
                provider,
                "unreachable",
                $"تعذر الوصول إلى ComfyUI: {Truncate(ex.Message)}",
                endpoint));
        }
    }

    [HttpPost("jobs/{id:long}/retry")]
    public async Task<IActionResult> Retry(
        long id,
        CancellationToken cancellationToken) =>
        await _jobs.RetryJobAsync(id, cancellationToken)
            ? NoContent()
            : NotFound(new { message = "المهمة غير موجودة." });

    public sealed record BulkGenerationRequest(
        bool RetryFailed = false,
        bool RegenerateCompleted = false);

    public sealed record ImageProviderTestResult(
        string Provider,
        string State,
        string Message,
        string Endpoint);

    private static string Truncate(string value) =>
        value.Length > 600 ? value[..600] : value;
}