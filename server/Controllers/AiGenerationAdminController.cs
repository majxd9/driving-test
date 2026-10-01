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
        _httpClientFactory = httpClientClientFactory;
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

            if (string.IsNullOrWhiteSpace(token))
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "unconfigured",
                    "يجب ضبط QUESTION_IMAGE_HF_TOKEN.",
                    $"https://router.huggingface.co/{hfProvider}/models/{model}"));
            }

            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(6));

                using var client = _httpClientFactory.CreateClient("HuggingFaceImage");
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"https://huggingface.co/api/models/{Uri.EscapeDataString(model).Replace("%2F", "/")}");
                request.Headers.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                using var response = await client.SendAsync(request, timeout.Token);

                if (!response.IsSuccessStatusCode)
                {
                    var details = await response.Content.ReadAsStringAsync(timeout.Token);
                    return Ok(new ImageProviderTestResult(
                        provider,
                        "error",
                        $"فشل التحقق من توكن Hugging Face أو النموذج: HTTP {(int)response.StatusCode}. {Truncate(details)}",
                        $"https://router.huggingface.co/{hfProvider}/models/{model}"));
                }

                var route = $"https://router.huggingface.co/{hfProvider}/{EncodePath(model)}?_subdomain=queue";

                return Ok(new ImageProviderTestResult(
                    provider,
                    "connected",
                    $"التوكن والموديل متاحان، ومسار {hfProvider} مضبوط. فحص الإعداد لا ينفّذ توليد صورة فعلية.",
                    route));
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    "انتهت مهلة فحص Hugging Face قبل اكتمال التحقق.",
                    $"https://router.huggingface.co/{hfProvider}/models/{model}"));
            }
            catch (Exception ex)
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    $"تعذر فحص Hugging Face: {ex.Message}",
                    $"https://router.huggingface.co/{hfProvider}/models/{model}"));
            }
        }

        return Ok(new ImageProviderTestResult(
            provider,
            "unsupported",
            $"مزود الصور '{provider}' غير مدعوم.",
            endpoint));
    }

    private static string EncodePath(string value) =>
        string.Join(
            "/",
            value.Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(Uri.EscapeDataString));

    private static string Truncate(string value) =>
        value.Length > 600 ? value[..600] : value;
}
