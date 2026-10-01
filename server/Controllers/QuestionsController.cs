using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http.Json;
using System.Text.Json;
using System.Globalization;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private const string ElevenLabsVoiceId = "mbMMm5Ft0vNUPsMKAZFu";
    private const string AudioPromptFirstEntryKey = "question-audio-first-entry";
    private const string AudioPromptEnabledKey = "question-audio-enabled";
    private const string AudioPromptDisabledKey = "question-audio-disabled";

    // هذان النصان يُرسلان إلى نفس صوت ElevenLabs المستخدم للأسئلة،
    // وبالتالي يُولّدان تلقائياً مع بقية أصوات المحتوى.
    private static readonly (string Key, string Text)[] AudioPromptDefinitions =
    {
        (AudioPromptFirstEntryKey, "إذا بدك تشغيل الصوت، اضغط زر التشغيل."),
        (AudioPromptEnabledKey, "الصوت سيبقى شغال حتى تضغط إيقاف."),
        (AudioPromptDisabledKey, "الصوت متوقف.")
    };
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly AiGenerationJobService _generationJobs;

    public QuestionsController(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        AiGenerationJobService generationJobs)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _generationJobs = generationJobs;
    }

    [HttpGet]
    public async Task<ActionResult<List<Question>>> GetByCategory([FromQuery] QuestionCategory category)
    {
        var questions = await QuestionBankCache.GetCategoryAsync(_db, category);
        await _generationJobs.AttachStudentMediaUrlsAsync(questions, HttpContext.RequestAborted);

        Response.Headers.CacheControl = "private,max-age=60,stale-while-revalidate=30";
        return Ok(DeduplicateQuestions(questions));
    }

    [HttpGet("count")]
    public async Task<ActionResult<int>> GetCount()
    {
        await QuestionCountCache.InitializeAsync(_db);
        Response.Headers.CacheControl = "private,max-age=300,stale-while-revalidate=60";
        return Ok(QuestionCountCache.Total);
    }

    [HttpGet("exam/{modelId:int}")]
    public async Task<ActionResult<List<ExamQuestionResponse>>> GetExam(int modelId)
    {
        if (modelId is < 1 or > 8) return BadRequest(new { message = "رقم النموذج يجب أن يكون بين 1 و8." });
        Response.Headers.CacheControl = "no-store";

        var required = new[]
        {
            (Category: QuestionCategory.Ser, Count: 12),
            (Category: QuestionCategory.Ishara, Count: 12),
            (Category: QuestionCategory.Mechanic, Count: 6)
        };

        var picked = new List<Question>(30);
        var salts = new Dictionary<QuestionCategory, int>
        {
            [QuestionCategory.Ser] = 11,
            [QuestionCategory.Ishara] = 23,
            [QuestionCategory.Mechanic] = 37
        };

        foreach (var (category, count) in required)
        {
            var source = (await QuestionBankCache.GetCategoryAsync(_db, category))
                .OrderBy(q => q.Id)
                .ToList();

            var unique = DeduplicateQuestions(source);
            if (unique.Count < count)
                return Conflict(new { message = $"قسم {CategoryName(category)} لا يحتوي عدداً كافياً من الأسئلة الفريدة الصالحة لهذا النموذج." });

            var categoryPicked = Pick(unique, count, checked(modelId * 1009 + salts[category]));

            // ضمان ظهور الأسئلة الجديدة ذات الرسومات (236-245) في نماذج الامتحان.
            // لا نضيفها فوق العدد المحدد؛ نستبدل سؤالاً واحداً فقط إذا لم يكن موجوداً.
            if (category == QuestionCategory.Ishara)
            {
                var priority = unique
                    .Where(q => Regex.IsMatch(q.ImageUrl ?? string.Empty, @"/signs/sign_(23[6-9]|24[0-5])\.svg$", RegexOptions.IgnoreCase))
                    .OrderBy(q => q.Id)
                    .ToList();

                if (priority.Count > 0 && !categoryPicked.Any(q => priority.Any(p => p.Id == q.Id)))
                {
                    var guaranteed = priority[(modelId - 1) % priority.Count];
                    categoryPicked[^1] = guaranteed;
                }
            }

            // ضمان أن سؤال دخول النفق موجود ضمن نماذج الامتحان، دون زيادة عدد الأسئلة.
            if (category == QuestionCategory.Ser)
            {
                var tunnel = unique
                    .Where(q => q.Text.Contains("نفق", StringComparison.Ordinal))
                    .OrderBy(q => q.Id)
                    .FirstOrDefault();

                if (tunnel is not null && !categoryPicked.Any(q => q.Id == tunnel.Id))
                    categoryPicked[^1] = tunnel;
            }

            picked.AddRange(categoryPicked);
        }

        await _generationJobs.AttachStudentMediaUrlsAsync(picked, HttpContext.RequestAborted);

        return Ok(picked.Select(q => new ExamQuestionResponse(
            q.Id,
            q.Text,
            q.Options,
            q.CorrectAnswerIndex,
            q.Explanation,
            q.ImageUrl,
            q.DiagramType,
            q.DiagramUrl,
            q.DiagramTitle,
            q.DiagramDescription,
            q.AudioUrl,
            q.AiImageUrl
        )).ToList());
    }

    [HttpGet("audio-prompt/{key}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAudioPrompt(string key, CancellationToken cancellationToken)
    {
        var prompt = await _db.SystemAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Key == key, cancellationToken);

        if (prompt is null || prompt.AudioBytes.Length == 0)
            return NotFound(new { message = "ملف رسالة الصوت غير موجود." });

        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.ETag = $"\"{prompt.ContentHash}\"";
        Response.Headers["Content-Disposition"] = "inline";
        Response.Headers["X-Audio-Bytes"] = prompt.AudioBytes.LongLength.ToString();
        Response.Headers["X-Audio-Format"] = "mp3";

        return File(prompt.AudioBytes, "audio/mpeg", enableRangeProcessing: false);
    }

    [HttpGet("{id:int}/audio-debug")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAudioDebug(int id, CancellationToken cancellationToken)
    {
        var audio = await _db.QuestionAudios.AsNoTracking().SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);
        if (audio is null) return NotFound(new { message = "لا يوجد سجل صوت لهذا السؤال." });
        var question = await _db.Questions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        var currentHash = question is null ? null : QuestionAudioTextBuilder.GetCurrentHash(question);
        var legacyHash = question is null ? null : QuestionAudioTextBuilder.GetLegacyHash(question);
        var bytes = audio.AudioBytes ?? Array.Empty<byte>();
        var firstBytes = bytes.Take(16).Select(b => b.ToString("X2")).ToArray();
        var looksLikeMp3 = bytes.Length >= 3 && ((bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33) || (bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0));
        return Ok(new
        {
            questionId = id,
            bytes = bytes.Length,
            firstBytes,
            looksLikeMp3,
            storedHash = audio.ContentHash,
            currentHash,
            legacyHash,
            hashMatches = currentHash is not null &&
                          (string.Equals(currentHash, audio.ContentHash, StringComparison.Ordinal) ||
                           string.Equals(legacyHash, audio.ContentHash, StringComparison.Ordinal)),
            contentType = "audio/mpeg"
        });
    }

    [HttpGet("{id:int}/ai-image")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAiImage(
        int id,
        CancellationToken cancellationToken)
    {
        var image = await _db.QuestionAiImages
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);

        if (image is null || image.ImageBytes.Length == 0)
            return NotFound(new { message = "صورة AI غير موجودة لهذا السؤال." });

        var question = await _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (question is null ||
            !string.Equals(
                image.ContentHash,
                QuestionImagePromptBuilder.GetContentHash(question),
                StringComparison.Ordinal))
        {
            return NotFound(new { message = "صورة AI الحالية غير جاهزة لهذا السؤال." });
        }

        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.ETag = $""{image.ContentHash}"";
        return File(image.ImageBytes, image.ContentType);
    }

    [HttpGet("{id:int}/audio")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAudio(int id, CancellationToken cancellationToken)
    {
        var audio = await _db.QuestionAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);

        if (audio is null || audio.AudioBytes.Length == 0)
            return NotFound(new { message = "ملف الصوت غير موجود لهذا السؤال." });

        var question = await _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        // لا نمنع تشغيل ملف صوت موجود بسبب اختلاف الـhash.
        // الـhash يحدد فقط إن كان الملف مطابقاً للمحتوى الحالي، وليس صلاحية تشغيله.
        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.ETag = $"\"{audio.ContentHash}\"";
        Response.Headers["Content-Disposition"] = "inline";
        Response.Headers["Accept-Ranges"] = "bytes";
        Response.Headers["X-Audio-Bytes"] = audio.AudioBytes.LongLength.ToString();

        // استخدم Stream بدلاً من تمرير byte[] مباشرةً حتى تكون استجابة Range
        // أكثر ثباتاً على متصفحات الهاتف وWebView.
        var stream = new MemoryStream(audio.AudioBytes, writable: false);
        return new FileStreamResult(stream, "audio/mpeg")
        {
            EnableRangeProcessing = true
        };
    }


    // Full-file playback endpoint for mobile browsers/WebViews that reject 206 Range responses.
    [HttpGet("{id:int}/audio-play")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAudioForPlayback(int id, CancellationToken cancellationToken)
    {
        var audio = await _db.QuestionAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);

        if (audio is null || audio.AudioBytes.Length == 0)
            return NotFound(new { message = "ملف الصوت غير موجود لهذا السؤال." });

        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.ETag = $"\"{audio.ContentHash}\"";
        Response.Headers["Content-Disposition"] = "inline";
        Response.Headers["X-Audio-Bytes"] = audio.AudioBytes.LongLength.ToString();
        Response.Headers["X-Audio-Format"] = "mp3";

        return File(audio.AudioBytes, "audio/mpeg", enableRangeProcessing: false);
    }

    private async Task AttachAudioUrlsAsync(IEnumerable<Question> questions)
    {
        var list = questions.ToList();
        if (list.Count == 0) return;

        var ids = list.Select(q => q.Id).ToArray();
        var hashes = await _db.QuestionAudios
            .AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId) && x.AudioBytes.Length > 0)
            .Select(x => new { x.QuestionId, x.ContentHash })
            .ToListAsync();

        foreach (var item in hashes)
        {
            var question = list.FirstOrDefault(q => q.Id == item.QuestionId);
            if (question is not null)
            {
                // وجود bytes يعني أن هناك ملفاً محفوظاً بالفعل؛ لا نحجب تشغيله
                // فقط لأن محتوى السؤال تغيّر بعد توليد الصوت.
                question.AudioUrl = $"/api/questions/{question.Id}/audio-play?v={item.ContentHash}";
            }
        }
    }

    public sealed record GenerateAudioResponse(
        int QuestionId,
        string? AudioUrl,
        bool Generated,
        string ContentHash,
        long JobId,
        string Status);

    [HttpPost("/api/admin/questions/generate-audio-prompts")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GenerateAudioPrompts(CancellationToken cancellationToken)
    {
        var apiKey = _configuration["ELEVENLABS_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return Problem("لم يتم ضبط ELEVENLABS_API_KEY على الخادم.");

        var client = _httpClientFactory.CreateClient("ElevenLabs");
        var generated = 0;

        foreach (var definition in AudioPromptDefinitions)
        {
            var hash = GetContentHash(definition.Text);
            var existing = await _db.SystemAudios
                .SingleOrDefaultAsync(x => x.Key == definition.Key, cancellationToken);

            if (existing is not null &&
                existing.ContentHash == hash &&
                existing.AudioBytes.Length > 0)
            {
                continue;
            }

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"v1/text-to-speech/{ElevenLabsVoiceId}?output_format=mp3_44100_128");

            request.Headers.TryAddWithoutValidation("xi-api-key", apiKey);
            request.Content = JsonContent.Create(new
            {
                text = definition.Text,
                model_id = "eleven_multilingual_v2",
                voice_settings = new
                {
                    stability = 0.55,
                    similarity_boost = 0.8,
                    style = 0.1,
                    use_speaker_boost = true
                }
            });

            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                var providerStatus = string.Empty;
                var providerMessage = string.Empty;

                try
                {
                    using var document = JsonDocument.Parse(error);
                    var root = document.RootElement;

                    if (root.TryGetProperty("detail", out var detail))
                    {
                        if (detail.ValueKind == JsonValueKind.Object)
                        {
                            providerStatus = detail.TryGetProperty("status", out var status)
                                ? status.GetString() ?? string.Empty
                                : string.Empty;
                            providerMessage = detail.TryGetProperty("message", out var detailMessage)
                                ? detailMessage.GetString() ?? string.Empty
                                : string.Empty;
                        }
                        else
                        {
                            providerMessage = detail.GetString() ?? string.Empty;
                        }
                    }

                    if (string.IsNullOrWhiteSpace(providerStatus) &&
                        root.TryGetProperty("status", out var topStatus))
                        providerStatus = topStatus.GetString() ?? string.Empty;

                    if (string.IsNullOrWhiteSpace(providerMessage) &&
                        root.TryGetProperty("message", out var topMessage))
                        providerMessage = topMessage.GetString() ?? string.Empty;
                }
                catch (JsonException)
                {
                    // Keep the raw provider response below when it is not JSON.
                }

                var message = string.IsNullOrWhiteSpace(providerMessage)
                    ? $"تعذر توليد رسالة الصوت من ElevenLabs: {definition.Key}"
                    : $"رسالة الصوت {definition.Key} — ElevenLabs: {providerStatus} — {providerMessage}";

                return StatusCode((int)response.StatusCode, new
                {
                    message,
                    providerStatus,
                    providerMessage,
                    details = error
                });
            }

            var audioBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (audioBytes.Length == 0)
                return Problem($"تمت استجابة ElevenLabs بدون ملف صوتي للرسالة: {definition.Key}.");

            if (existing is null)
            {
                _db.SystemAudios.Add(new SystemAudio
                {
                    Key = definition.Key,
                    AudioBytes = audioBytes,
                    ContentHash = hash,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.AudioBytes = audioBytes;
                existing.ContentHash = hash;
                existing.CreatedAt = DateTime.UtcNow;
            }

            generated++;
        }

        if (generated > 0)
            await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            generated,
            total = AudioPromptDefinitions.Length,
            firstEntryKey = AudioPromptFirstEntryKey,
            enabledKey = AudioPromptEnabledKey,
            disabledKey = AudioPromptDisabledKey
        });
    }

    [HttpPost("/api/admin/questions/{id:int}/generate-audio")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<GenerateAudioResponse>> GenerateAudio(
        int id,
        [FromBody] ForceGenerationRequest? request,
        CancellationToken cancellationToken)
    {
        var question = await _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        await _generationJobs.EnsureQuestionJobsAsync(
            question,
            force: request?.Force ?? false,
            cancellationToken);

        var hash = QuestionAudioTextBuilder.GetCurrentHash(question);
        var job = await _db.AiGenerationJobs
            .AsNoTracking()
            .SingleAsync(
                x => x.QuestionId == id &&
                     x.JobType == AiGenerationJobType.Audio &&
                     x.ContentHash == hash,
                cancellationToken);

        var audio = await _db.QuestionAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);

        var ready = audio is not null &&
                    (audio.ContentHash == hash ||
                     audio.ContentHash == QuestionAudioTextBuilder.GetLegacyHash(question));

        return Ok(new GenerateAudioResponse(
            id,
            ready ? $"/api/questions/{id}/audio-play?v={audio!.ContentHash}" : null,
            false,
            hash,
            job.Id,
            job.Status.ToString()));
    }

    [HttpPost("/api/admin/questions/{id:int}/generate-image")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GenerateImage(
        int id,
        [FromBody] ForceGenerationRequest? request,
        CancellationToken cancellationToken)
    {
        var question = await _db.Questions
            .AsNoTracking()
            .SingleOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        if (!QuestionImagePromptBuilder.ShouldGenerate(question))
            return BadRequest(new { message = "هذا السؤال لا يحتاج صورة AI حسب قاعدة توليد الصور الحالية." });

        await _generationJobs.EnsureQuestionJobsAsync(
            question,
            force: request?.Force ?? false,
            cancellationToken);

        var hash = QuestionImagePromptBuilder.GetContentHash(question);
        var job = await _db.AiGenerationJobs
            .AsNoTracking()
            .SingleAsync(
                x => x.QuestionId == id &&
                     x.JobType == AiGenerationJobType.AiImage &&
                     x.ContentHash == hash,
                cancellationToken);

        return Ok(new
        {
            questionId = id,
            generated = false,
            contentHash = hash,
            jobId = job.Id,
            status = job.Status.ToString()
        });
    }

    public sealed record ForceGenerationRequest(bool Force = false);

    private static string CategoryName(QuestionCategory category) => category switch
    {
        QuestionCategory.Ser => "قواعد السير",
        QuestionCategory.Ishara => "الإشارات المرورية",
        QuestionCategory.Mechanic => "الميكانيك",
        _ => category.ToString()
    };

    private static string NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return string.Join(" ", value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));
    }

    private static string NormalizeQuestionImage(string? src)
    {
        if (string.IsNullOrWhiteSpace(src)) return src ?? string.Empty;

        var match = Regex.Match(
            src,
            @"^/signs/sign_(23[6-9]|24[0-5])\.(?:webp|png|jpe?g)$",
            RegexOptions.IgnoreCase);

        if (match.Success && int.TryParse(match.Groups[1].Value, out var number))
            return $"/signs/sign_{number}.svg";

        return src;
    }

    private static bool HasCanonicalQuestionImage(Question question)
    {
        var src = NormalizeQuestionImage(question.ImageUrl);
        question.ImageUrl = string.IsNullOrWhiteSpace(src) ? null : src;

        if (question.Category == QuestionCategory.Ishara && string.IsNullOrWhiteSpace(src)) return false;
        if (string.IsNullOrWhiteSpace(src)) return question.Category != QuestionCategory.Ishara;

        var signMatch = Regex.Match(src, @"(?:^|/)sign_(\d+)\.(?:webp|png|jpe?g|svg)$", RegexOptions.IgnoreCase);
        if (signMatch.Success)
        {
            var number = int.Parse(signMatch.Groups[1].Value);
            var trafficSign = (number >= 1 && number <= 131) || (number >= 200 && number <= 205) || (number >= 236 && number <= 245);
            var mechanicInSigns = number >= 210 && number <= 214;
            return trafficSign || mechanicInSigns;
        }

        var mechanicMatch = Regex.Match(src, @"(?:^|/)mechanic/mechanic_(\d+)\.(?:webp|png|jpe?g)$", RegexOptions.IgnoreCase);
        if (mechanicMatch.Success)
        {
            var number = int.Parse(mechanicMatch.Groups[1].Value);
            return number >= 215 && number <= 235;
        }

        return false;
    }

    private static void RepairKnownQuestion(Question question)
    {
        const string skidQuestion = "في حال انزلقت مركبتك عليك كسائق أن تكون ردة فعلك الأولى:";
        if (question.Category == QuestionCategory.Ser &&
            question.Text == skidQuestion &&
            question.Options.Count == 4 &&
            question.Options.Distinct(StringComparer.Ordinal).Count() < 4)
        {
            question.Options = new List<string>
            {
                "تضغط على الفرامل وتوجه المركبة بعكس اتجاه انزلاق مؤخرتها",
                "لا تضغط على الفرامل وتوجه المركبة إلى الجهة التي تنزل بها مؤخرتها",
                "تضغط على الفرامل وتوجه المركبة إلى الجهة التي تنزل بها مؤخرتها",
                "تترك المقود دون توجيه حتى تتوقف المركبة"
            };
            question.CorrectAnswerIndex = 1;
        }
    }

    private static List<Question> DeduplicateQuestions(IEnumerable<Question> source)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<Question>();
        foreach (var question in source.OrderBy(q => q.Id))
        {
            if (!HasCanonicalQuestionImage(question)) continue;

            RepairKnownQuestion(question);

            var key = $"{question.Category}|{NormalizeText(question.Text)}|{string.Join("\u001f", question.Options ?? new List<string>())}|{NormalizeText(question.ImageUrl)}|{NormalizeText(question.DiagramUrl)}";
            if (seen.Add(key)) result.Add(question);
        }
        return result;
    }

    private static List<Question> Pick(List<Question> source, int count, int seed)
    {
        var state = unchecked((uint)(seed * 2654435761u));
        for (var i = source.Count - 1; i > 0; i--)
        {
            state = unchecked((state ^ (state >> 16)) * 2246822519u + 3266489917u);
            var j = (int)(state % (uint)(i + 1));
            (source[i], source[j]) = (source[j], source[i]);
        }
        return source.Take(count).ToList();
    }
}
