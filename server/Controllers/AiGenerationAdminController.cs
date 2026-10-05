using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using DrivingTestApi.Data;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Controllers;

public sealed record BulkGenerationRequest(bool RetryFailed = false, bool RegenerateCompleted = false);

public sealed record ImageProviderTestResult(string Provider, string State, string Message, string Endpoint);

public sealed record AiGenerationControlRequest(bool? AudioEnabled = null, bool? ImageEnabled = null);
public sealed record ImageProviderSelectionRequest(string Provider);
public sealed record AiTestRunRequest(int QuestionId, string Type, string Provider);

[ApiController]
[Route("api/admin/ai-generation")]
[Authorize(Roles = "Admin")]
public sealed class AiGenerationAdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AiGenerationJobService _jobs;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly GeminiQuestionImageGenerator _geminiImageGenerator;
    private readonly HuggingFaceQuestionImageGenerator _huggingFaceImageGenerator;
    private readonly EdenAiQuestionImageGenerator _edenImageGenerator;
    private readonly ComfyUiQuestionImageGenerator _comfyUiImageGenerator;
    private readonly AiTestRunService _testRuns;

    public AiGenerationAdminController(
        AppDbContext db,
        AiGenerationJobService jobs,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        GeminiQuestionImageGenerator geminiImageGenerator,
        HuggingFaceQuestionImageGenerator huggingFaceImageGenerator,
        EdenAiQuestionImageGenerator edenImageGenerator,
        ComfyUiQuestionImageGenerator comfyUiImageGenerator,
        AiTestRunService testRuns)
    {
        _db = db;
        _jobs = jobs;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _geminiImageGenerator = geminiImageGenerator;
        _huggingFaceImageGenerator = huggingFaceImageGenerator;
        _edenImageGenerator = edenImageGenerator;
        _comfyUiImageGenerator = comfyUiImageGenerator;
        _testRuns = testRuns;
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

        var control = await _jobs.GetControlStateAsync(cancellationToken);
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
            actualGenerator = control.ImageProvider switch
            {
                "gemini" => typeof(GeminiQuestionImageGenerator).FullName,
                "huggingface" => typeof(HuggingFaceQuestionImageGenerator).FullName,
                "edenai" => typeof(EdenAiQuestionImageGenerator).FullName,
                "comfyui" => typeof(ComfyUiQuestionImageGenerator).FullName,
                _ => null
            },
            promptSource,
            promptBankEntries = ScenePromptBank.Count,
            promptLength = positive.Length,
            promptFingerprint,
            contentHash = QuestionImagePromptBuilder.GetContentHash(question),
            prompt = positive
        });
    }

    [HttpPost("test-image-generation/{id:int}")]
    public async Task<IActionResult> TestImageGeneration(
        int id,
        CancellationToken cancellationToken)
    {
        var question = await _jobs.GetQuestionForDiagnosticsAsync(id, cancellationToken);
        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        var control = await _jobs.GetControlStateAsync(cancellationToken);
        if (control.ImageProvider == "none")
            return BadRequest(new { message = "اختر مزود صور أولاً من مركز التحكم." });

        if (!QuestionImagePromptBuilder.ShouldGenerate(question))
            return BadRequest(new { message = "هذا السؤال غير مطلوب له توليد صورة AI حسب قواعد المشروع." });

        var generator = control.ImageProvider switch
        {
            "gemini" => (IQuestionImageGenerator)_geminiImageGenerator,
            "huggingface" => _huggingFaceImageGenerator,
            "edenai" => _edenImageGenerator,
            "comfyui" => _comfyUiImageGenerator,
            _ => throw new InvalidOperationException("مزود الصور غير مدعوم.")
        };

        var (positive, _) = QuestionImagePromptBuilder.Build(question);
        var promptFingerprint = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(positive)))
            .ToLowerInvariant()[..16];

        var result = await generator.GenerateAsync(question, cancellationToken);
        var imageHash = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(result.Bytes))
            .ToLowerInvariant();

        Response.Headers.CacheControl = "no-store, no-cache";
        Response.Headers["X-AI-Test-Provider"] = control.ImageProvider;
        Response.Headers["X-AI-Test-Question-Id"] = id.ToString(System.Globalization.CultureInfo.InvariantCulture);
        Response.Headers["X-AI-Test-Prompt-Fingerprint"] = promptFingerprint;
        Response.Headers["X-AI-Test-Image-Hash"] = imageHash;
        Response.Headers["X-AI-Test-Bytes"] = result.Bytes.Length.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return File(result.Bytes, result.ContentType);
    }

    [HttpPost("test/start")]
    public async Task<IActionResult> StartAiTest(
        [FromBody] AiTestRunRequest request,
        CancellationToken cancellationToken)
    {
        var type = request.Type?.Trim().ToLowerInvariant() switch
        {
            "image" => AiTestRunType.Image,
            "audio" => AiTestRunType.Audio,
            _ => throw new InvalidOperationException("نوع الاختبار يجب أن يكون image أو audio.")
        };

        // The provider is explicit and the worker calls only that provider. No fallback.
        var provider = request.Provider?.Trim().ToLowerInvariant() ?? string.Empty;

        try
        {
            var run = await _testRuns.CreateAsync(
                request.QuestionId,
                type,
                provider,
                cancellationToken);
            return Accepted(run);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("test/{id:long}")]
    public async Task<IActionResult> GetAiTest(
        long id,
        CancellationToken cancellationToken)
    {
        var run = await _testRuns.GetViewAsync(id, cancellationToken);
        return run is null
            ? NotFound(new { message = "اختبار التوليد غير موجود." })
            : Ok(run);
    }

    [HttpGet("test/{id:long}/media")]
    public async Task<IActionResult> GetAiTestMedia(
        long id,
        CancellationToken cancellationToken)
    {
        var run = await _testRuns.GetViewAsync(id, cancellationToken);
        if (run is null)
            return NotFound(new { message = "اختبار التوليد غير موجود." });
        if (!run.HasMedia)
            return NotFound(new { message = "ملف الاختبار لم يصبح جاهزاً بعد." });

        var bytes = await _testRuns.GetMediaAsync(id, cancellationToken);
        var contentType = await _testRuns.GetMediaContentTypeAsync(id, cancellationToken);
        if (bytes is null || bytes.Length == 0)
            return NotFound(new { message = "ملف الاختبار فارغ." });

        Response.Headers.CacheControl = "no-store, no-cache";
        Response.Headers["Content-Disposition"] = "inline";
        Response.Headers["X-AI-Test-Provider"] = run.Provider;
        Response.Headers["X-AI-Test-Question-Id"] = run.QuestionId.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return File(bytes, contentType ?? "application/octet-stream");
    }

    [HttpPost("test/{id:long}/approve")]
    public async Task<IActionResult> ApproveAiTest(
        long id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _testRuns.ApproveAsync(id, cancellationToken);
            return result is null
                ? NotFound(new { message = "اختبار التوليد غير موجود." })
                : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("test/{id:long}/reject")]
    public async Task<IActionResult> RejectAiTest(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _testRuns.RejectAsync(id, cancellationToken);
        return result is null
            ? NotFound(new { message = "اختبار التوليد غير موجود." })
            : Ok(result);
    }

    public sealed record AiImageImportResult(
        int TotalEntries,
        int Imported,
        int Replaced,
        int Skipped,
        int Invalid,
        IReadOnlyList<int> ImportedQuestionIds,
        IReadOnlyList<string> Problems);

    [HttpPost("import-zip")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(250_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 250_000_000)]
    public async Task<ActionResult<AiImageImportResult>> ImportImagesZip(
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "اختر ملف ZIP يحتوي صور الأسئلة أولاً." });

        if (!string.Equals(Path.GetExtension(file.FileName), ".zip", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "الملف المطلوب يجب أن يكون ZIP." });

        if (file.Length > 240_000_000)
            return BadRequest(new { message = "حجم ملف ZIP أكبر من الحد المسموح للاستيراد." });

        var problems = new List<string>();
        var entries = new List<(int QuestionId, string EntryName)>();
        var seenIds = new HashSet<int>();
        long totalUncompressed = 0;

        await using var stream = file.OpenReadStream();
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: false);

        foreach (var entry in archive.Entries)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (string.IsNullOrEmpty(entry.Name)) continue;

            var normalizedName = entry.FullName.Replace('\\\\', '/');
            var baseName = Path.GetFileName(normalizedName);
            if (!string.Equals(baseName, normalizedName, StringComparison.Ordinal))
            {
                problems.Add($"المسار غير مسموح: {entry.FullName}");
                continue;
            }

            if (!string.Equals(Path.GetExtension(baseName), ".webp", StringComparison.OrdinalIgnoreCase))
                continue;

            var stem = Path.GetFileNameWithoutExtension(baseName);
            if (!int.TryParse(stem, out var questionId) || questionId < 1 || questionId > 397)
            {
                problems.Add($"اسم صورة غير صالح: {entry.FullName}");
                continue;
            }

            if (!seenIds.Add(questionId))
            {
                problems.Add($"الصورة مكررة للسؤال #{questionId}: {entry.FullName}");
                continue;
            }

            if (entry.Length <= 0 || entry.Length > 8_000_000)
            {
                problems.Add($"حجم الصورة غير صالح للسؤال #{questionId}: {entry.Length} bytes");
                continue;
            }

            totalUncompressed += entry.Length;
            if (totalUncompressed > 240_000_000)
            {
                problems.Add("إجمالي الحجم غير المضغوط داخل ZIP تجاوز الحد الآمن.");
                break;
            }

            entries.Add((questionId, entry.FullName));
        }

        if (entries.Count == 0)
            return BadRequest(new { message = "لم يتم العثور على صور WebP صالحة بأسماء أرقام الأسئلة.", problems });

        var ids = entries.Select(x => x.QuestionId).ToArray();
        var questions = await _db.Questions
            .Where(q => ids.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        foreach (var id in ids)
            if (!questions.ContainsKey(id))
                problems.Add($"السؤال #{id} غير موجود في قاعدة البيانات.");

        if (problems.Count > 0)
            return BadRequest(new
            {
                message = "تم إيقاف الاستيراد قبل الكتابة لأن ملف ZIP يحتوي مشاكل في البنية أو أرقام الأسئلة.",
                problems
            });

        var existingImages = await _db.QuestionAiImages
            .AsNoTracking()
            .Where(x => x.ImageBytes.Length > 0 && x.ImageHash != "")
            .Select(x => new { x.QuestionId, x.ImageHash })
            .ToListAsync(cancellationToken);
        var hashToQuestion = existingImages
            .GroupBy(x => x.ImageHash, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().QuestionId, StringComparer.OrdinalIgnoreCase);

        var imported = 0;
        var replaced = 0;
        var importedIds = new List<int>();

        foreach (var (questionId, entryName) in entries)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var entry = archive.GetEntry(entryName);
            var question = questions[questionId];
            if (entry is null)
            {
                problems.Add($"تعذر قراءة الإدخال: {entryName}");
                continue;
            }

            await using var entryStream = entry.Open();
            using var buffer = new MemoryStream(capacity: checked((int)entry.Length));
            await entryStream.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();

            if (bytes.Length < 12 ||
                bytes[0] != (byte)'R' || bytes[1] != (byte)'I' || bytes[2] != (byte)'F' || bytes[3] != (byte)'F' ||
                bytes[8] != (byte)'W' || bytes[9] != (byte)'E' || bytes[10] != (byte)'B' || bytes[11] != (byte)'P')
            {
                problems.Add($"السؤال #{questionId}: الملف ليس WebP صالحاً.");
                continue;
            }

            var imageHash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
            if (hashToQuestion.TryGetValue(imageHash, out var previousQuestionId) && previousQuestionId != questionId)
            {
                problems.Add($"السؤال #{questionId}: نفس الصورة مستخدمة مسبقاً للسؤال #{previousQuestionId}.");
                continue;
            }

            var contentHash = QuestionImagePromptBuilder.GetContentHash(question);
            var now = DateTime.UtcNow;
            var image = await _db.QuestionAiImages
                .SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);

            if (image is null)
            {
                _db.QuestionAiImages.Add(new QuestionAiImage
                {
                    QuestionId = questionId,
                    ImageBytes = bytes,
                    ContentHash = contentHash,
                    ImageHash = imageHash,
                    ContentType = "image/webp",
                    CreatedAt = now
                });
                imported++;
            }
            else
            {
                var wasPresent = image.ImageBytes.Length > 0;
                image.ImageBytes = bytes;
                image.ContentHash = contentHash;
                image.ImageHash = imageHash;
                image.ContentType = "image/webp";
                image.CreatedAt = now;
                if (wasPresent) replaced++; else imported++;
            }

            var review = await _db.AiImageReviews
                .SingleOrDefaultAsync(x => x.QuestionId == questionId, cancellationToken);
            if (review is null)
            {
                _db.AiImageReviews.Add(new AiImageReview
                {
                    QuestionId = questionId,
                    ContentHash = contentHash,
                    Status = AiImageReviewStatus.Approved,
                    CreatedAt = now,
                    ReviewedAt = now
                });
            }
            else
            {
                review.ContentHash = contentHash;
                review.Status = AiImageReviewStatus.Approved;
                review.CreatedAt = now;
                review.ReviewedAt = now;
            }

            hashToQuestion[imageHash] = questionId;
            importedIds.Add(questionId);
        }

        await _db.SaveChangesAsync(cancellationToken);

        Response.Headers.CacheControl = "no-store";
        return Ok(new AiImageImportResult(
            entries.Count,
            imported,
            replaced,
            0,
            problems.Count,
            importedIds.OrderBy(x => x).ToArray(),
            problems));
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
