using System.Text.Json;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

public sealed record BulkGenerationRequest(bool RetryFailed = false, bool RegenerateCompleted = false);

public sealed record ImageProviderTestResult(string Provider, string State, string Message, string Endpoint);

public sealed record AiGenerationControlRequest(bool? AudioEnabled = null, bool? ImageEnabled = null);
public sealed record ImageProviderSelectionRequest(string Provider);

[ApiController]
[Route("api/admin/ai-generation")]
[Authorize(Roles = "Admin")]
public sealed class AiGenerationAdminController : ControllerBase
{
    private readonly AiGenerationJobService _jobs;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IQuestionImageGenerator _imageGenerator;

    public AiGenerationAdminController(
        AiGenerationJobService jobs,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IQuestionImageGenerator imageGenerator)
    {
        _jobs = jobs;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _imageGenerator = imageGenerator;
    }

    [HttpGet("status")]
    public async Task<ActionResult<AiGenerationOverview>> Status(CancellationToken cancellationToken) =>
        Ok(await _jobs.GetOverviewAsync(cancellationToken));

    [HttpGet("control")]
    public async Task<ActionResult<AiGenerationControlState>> Control(CancellationToken cancellationToken) =>
        Ok(await _jobs.GetControlStateAsync(cancellationToken));

    [HttpPost("control/all/stop")]
    public async Task<ActionResult<AiGenerationControlState>> StopAll(CancellationToken cancellationToken)
    {
        var state = await _jobs.SetControlStateAsync(false, false, cancellationToken);
        return Ok(state);
    }

    [HttpPost("control/all/start")]
    public async Task<ActionResult<AiGenerationControlState>> StartAll(CancellationToken cancellationToken)
    {
        await _jobs.CleanupInvalidImageGenerationStateAsync(cancellationToken);
        var state = await _jobs.SetControlStateAsync(true, true, cancellationToken);
        await _jobs.ResumePendingTypeAsync(AiGenerationJobType.Audio, cancellationToken);
        await _jobs.ResumePendingTypeAsync(AiGenerationJobType.AiImage, cancellationToken);
        await _jobs.EnqueueMissingAsync(cancellationToken);
        return Ok(state);
    }

    [HttpPost("control/audio/start")]
    public async Task<ActionResult<AiGenerationControlState>> StartAudio(CancellationToken cancellationToken)
    {
        var state = await _jobs.SetControlStateAsync(true, null, cancellationToken);
        await _jobs.ResumePendingTypeAsync(AiGenerationJobType.Audio, cancellationToken);
        await _jobs.EnqueueBulkAsync(AiGenerationJobType.Audio, false, false, cancellationToken);
        return Ok(state);
    }

    [HttpPost("control/audio/stop")]
    public async Task<ActionResult<AiGenerationControlState>> StopAudio(CancellationToken cancellationToken) =>
        Ok(await _jobs.SetControlStateAsync(false, null, cancellationToken));

    [HttpPost("control/image/provider")]
    public async Task<ActionResult<AiGenerationControlState>> SetImageProvider(
        [FromBody] ImageProviderSelectionRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Provider))
            return BadRequest(new { message = "يجب تحديد مزود صور." });

        return Ok(await _jobs.SetImageProviderAsync(request.Provider, cancellationToken));
    }

    [HttpPost("control/image/start")]
    public async Task<ActionResult<AiGenerationControlState>> StartImage(CancellationToken cancellationToken)
    {
        await _jobs.CleanupInvalidImageGenerationStateAsync(cancellationToken);
        var state = await _jobs.SetControlStateAsync(null, true, cancellationToken);
        await _jobs.ResumePendingTypeAsync(AiGenerationJobType.AiImage, cancellationToken);
        await _jobs.EnqueueBulkAsync(AiGenerationJobType.AiImage, false, false, cancellationToken);
        return Ok(state);
    }

    [HttpPost("control/image/stop")]
    public async Task<ActionResult<AiGenerationControlState>> StopImage(CancellationToken cancellationToken) =>
        Ok(await _jobs.SetControlStateAsync(null, false, cancellationToken));

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

    [HttpPost("retry-failed/{type}")]
    public async Task<ActionResult<AiGenerationEnqueueResult>> RetryFailed(
        string type,
        CancellationToken cancellationToken)
    {
        var jobType = type.Trim().ToLowerInvariant() switch
        {
            "audio" => AiGenerationJobType.Audio,
            "image" => AiGenerationJobType.AiImage,
            _ => throw new ArgumentException("النوع يجب أن يكون audio أو image.")
        };

        return Ok(await _jobs.EnqueueBulkAsync(
            jobType,
            retryFailed: true,
            forceCompleted: false,
            cancellationToken));
    }

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
        var control = await _jobs.GetControlStateAsync(cancellationToken);

        if (control.AudioEnabled)
            await _jobs.ResumePendingTypeAsync(AiGenerationJobType.Audio, cancellationToken);

        if (control.ImageEnabled)
        {
            await _jobs.ResumePendingTypeAsync(AiGenerationJobType.AiImage, cancellationToken);
            await _jobs.CleanupInvalidImageGenerationStateAsync(cancellationToken);
        }

        if (control.AudioEnabled || control.ImageEnabled)
            await _jobs.EnqueueMissingAsync(cancellationToken);

        return Ok(await _jobs.GetOverviewAsync(cancellationToken));
    }

    [HttpPost("test-image-provider")]
    public async Task<IActionResult> TestImageProvider(CancellationToken cancellationToken)
    {
        var control = await _jobs.GetControlStateAsync(cancellationToken);
        var provider = control.ImageProvider;
        var endpoint = (_configuration["QUESTION_IMAGE_COMFYUI_URL"] ?? string.Empty).Trim();

        if (provider == "none")
            return Ok(new ImageProviderTestResult(provider, "disabled", "مولد الصور غير مفعّل حالياً. فعّل QUESTION_IMAGE_PROVIDER أولاً.", endpoint));

        if (provider == "edenai")
        {
            var token = (_configuration["EDENAI_API_KEY"] ?? string.Empty).Trim();
            const string route = "https://api.edenai.run/v3/info/";

            if (string.IsNullOrWhiteSpace(token))
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "unconfigured",
                    "يجب ضبط EDENAI_API_KEY.",
                    route));
            }

            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(6));

                using var client = _httpClientFactory.CreateClient("EdenAI");
                using var request = new HttpRequestMessage(HttpMethod.Get, "v3/info/");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                using var response = await client.SendAsync(request, timeout.Token);
                var details = await response.Content.ReadAsStringAsync(timeout.Token);

                return response.IsSuccessStatusCode
                    ? Ok(new ImageProviderTestResult(
                        provider,
                        "connected",
                        "تم التحقق من مفتاح Eden AI والوصول إلى كتالوج المنصة بنجاح. لا يتم تنفيذ توليد صورة ضمن هذا الفحص.",
                        route))
                    : Ok(new ImageProviderTestResult(
                        provider,
                        "error",
                        $"فشل التحقق من Eden AI: HTTP {(int)response.StatusCode}. {Truncate(details)}",
                        route));
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    "انتهت مهلة فحص Eden AI قبل اكتمال التحقق.",
                    route));
            }
            catch (Exception ex)
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "error",
                    $"تعذر فحص Eden AI: {ex.Message}",
                    route));
            }
        }

        if (provider == "gemini")
        {
            var token = (_configuration["GEMINI_API_KEY"] ?? string.Empty).Trim();
            var model = (_configuration["GEMINI_IMAGE_MODEL"] ?? "gemini-3.1-flash-image").Trim();
            const string route = "https://generativelanguage.googleapis.com/v1beta/interactions";

            if (string.IsNullOrWhiteSpace(token))
            {
                return Ok(new ImageProviderTestResult(
                    provider,
                    "unconfigured",
                    "يجب ضبط GEMINI_API_KEY.",
                    route));
            }

            return Ok(new ImageProviderTestResult(
                provider,
                "connected",
                $"تم العثور على مفتاح Gemini وإعداد مزود الصور {model}. هذا الفحص لا ينفذ توليداً مدفوعاً.",
                route));
        }

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
    [HttpGet("image-diagnostics/{id:int}")]
    public async Task<IActionResult> ImageDiagnostics(
        int id,
        CancellationToken cancellationToken)
    {
        var question = await _jobs.GetQuestionForDiagnosticsAsync(id, cancellationToken);
        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        var (positive, _) = QuestionImagePromptBuilder.Build(question);
        var promptSource = ScenePromptBank.TryGet(question, out _)
            ? "ScenePromptBank"
            : "FallbackBuilder";
        var promptFingerprint = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(positive)))
            .ToLowerInvariant();

        return Ok(new
        {
            questionId = question.Id,
            category = question.Category.ToString(),
            questionText = question.Text,
            configuredProvider = control.ImageProvider,
            executionProvider = AiGenerationJobService.ResolveImageExecutionProvider(
                control.ImageProvider,
                _configuration),
            actualGenerator = _imageGenerator.GetType().FullName,
            promptSource,
            promptBankEntries = ScenePromptBank.Count,
            promptLength = positive.Length,
            promptFingerprint,
            contentHash = QuestionImagePromptBuilder.GetContentHash(question),
            prompt = positive
        });
    }

    [HttpGet("completed-images")]
    public async Task<ActionResult<IReadOnlyList<CompletedAiImageItem>>> CompletedImages(
        [FromQuery] int limit = 24,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 60);

        var rows = await _jobs.GetCompletedAiImagesAsync(limit, cancellationToken);
        return Ok(rows);
    }

    [HttpGet("review/next")]
    public async Task<ActionResult<AiImageReviewItem?>> NextReview(CancellationToken cancellationToken)
    {
        return Ok(await _jobs.GetNextAiImageReviewAsync(cancellationToken));
    }

    [HttpGet("review-image/{id:int}")]
    public async Task<IActionResult> ReviewImage(
        int id,
        CancellationToken cancellationToken)
    {
        var image = await _jobs.GetReviewImageAsync(id, cancellationToken);

        if (image is null || image.ImageBytes.Length == 0)
            return NotFound(new { message = "صورة المراجعة غير موجودة." });

        Response.Headers.CacheControl = "private,no-store";
        Response.Headers["X-AI-Review-Hash"] = image.ContentHash;
        return File(image.ImageBytes, image.ContentType);
    }

    [HttpPost("review/{id:int}/approve")]
    public async Task<ActionResult<AiImageReviewItem?>> ApproveReview(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _jobs.ReviewAiImageAsync(id, true, cancellationToken));
    }

    [HttpPost("review/{id:int}/reject")]
    public async Task<ActionResult<AiImageReviewItem?>> RejectReview(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _jobs.ReviewAiImageAsync(id, false, cancellationToken));
    }

}
