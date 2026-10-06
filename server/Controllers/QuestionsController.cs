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

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AiGenerationJobService _generationJobs;
    private readonly SystemAudioPromptService _systemAudioPrompts;

    public QuestionsController(
        AppDbContext db,
        AiGenerationJobService generationJobs,
        SystemAudioPromptService systemAudioPrompts)
    {
        _db = db;
        _generationJobs = generationJobs;
        _systemAudioPrompts = systemAudioPrompts;
    }

    [HttpGet]
    public async Task<ActionResult<List<Question>>> GetByCategory([FromQuery] QuestionCategory category)
    {
        var questions = await QuestionBankCache.GetCategoryAsync(_db, category);
        await _generationJobs.AttachStudentMediaUrlsAsync(
            questions,
            HttpContext.RequestAborted,
            includeUnapprovedAiImages: User.IsInRole("Admin"));

        Response.Headers.CacheControl = User.IsInRole("Admin")
            ? "private,no-store"
            : "private,max-age=60,stale-while-revalidate=30";
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

        await _generationJobs.AttachStudentMediaUrlsAsync(
            picked,
            HttpContext.RequestAborted,
            includeUnapprovedAiImages: User.IsInRole("Admin"));

        return Ok(picked.Select(q => new ExamQuestionResponse(
            q.Id,
            q.Text,
            q.Options,
            -1,
            null,
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
        if (!SystemAudioCatalog.IsKnownKey(key))
            return NotFound(new { message = "رسالة الصوت النظامية غير معروفة." });

        var prompt = await _db.SystemAudios
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Key == key, cancellationToken);

        // This GET endpoint must remain side-effect free. Missing system audio is
        // restored by StartupMaintenanceService/Admin, not generated by anonymous callers.
        if (prompt is null || prompt.AudioBytes.Length == 0)
            return NotFound(new { message = "تعذر توفير ملف رسالة الصوت حالياً." });

        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.ETag = $"\"{prompt.ContentHash}\"";
        Response.Headers["Content-Disposition"] = "inline";
        Response.Headers["X-Audio-Bytes"] = prompt.AudioBytes.LongLength.ToString();
        Response.Headers["X-Audio-Format"] = "mp3";

        return File(prompt.AudioBytes, "audio/mpeg", enableRangeProcessing: false);
    }

    [HttpGet("{id:int}/audio-debug")]
    [Authorize(Roles = "Admin")]
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

        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        var currentImageHash = QuestionImagePromptBuilder.GetContentHash(question);
        if (!string.Equals(image.ContentHash, currentImageHash, StringComparison.Ordinal))
            return NotFound(new { message = "صورة AI قديمة لهذا السؤال وتم إبطالها." });

        var review = await _db.AiImageReviews
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.QuestionId == id, cancellationToken);

        if (review?.Status == AiImageReviewStatus.Hidden)
            return NotFound(new { message = "صورة AI مخفية لهذا السؤال." });

        // الطلاب/الزوار لا يمكنهم طلب صورة AI قبل موافقة الإدارة.
        // يبقى endpoint عاماً لأن عنصر <img> قد لا يرسل كوكي المصادقة
        // عبر النطاقات، لكن الموافقة نفسها تُفرض هنا على مستوى الخادم.
        if (!User.IsInRole("Admin") &&
            (review is null || review.Status != AiImageReviewStatus.Approved))
            return NotFound(new { message = "صورة AI بانتظار موافقة الإدارة." });

        // The URL contains both the content hash and generation timestamp, so a
        // regenerated image cannot remain trapped behind a previous immutable cache.
        var version = $"{image.ContentHash}-{image.CreatedAt.Ticks}";
        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.ETag = $"\"{version}\"";
        Response.Headers["X-AI-Image-Hash"] = image.ContentHash;
        return File(image.ImageBytes, image.ContentType);
    }

    [HttpPost("{id:int}/image/hide")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> HideQuestionImage(int id, CancellationToken cancellationToken)
    {
        var question = await _db.Questions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        if (string.IsNullOrWhiteSpace(question.ImageUrl))
            return NotFound(new { message = "لا توجد صورة أصلية مرتبطة بهذا السؤال." });

        question.ImageUrl = null;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { hidden = true, questionId = id });
    }

    [HttpDelete("{id:int}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveQuestionImage(int id, CancellationToken cancellationToken)
    {
        var question = await _db.Questions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (question is null)
            return NotFound(new { message = "السؤال غير موجود." });

        if (string.IsNullOrWhiteSpace(question.ImageUrl))
            return NotFound(new { message = "لا توجد صورة أصلية مرتبطة بهذا السؤال." });

        question.ImageUrl = null;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { deletedFromQuestion = true, questionId = id });
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
