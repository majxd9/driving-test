using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public sealed class SystemAudioPromptService
{
    private const string VoiceId = "0IwoSbTUTTn6egOMrnel";

    private readonly AppDbContext _db;
    private readonly FallbackQuestionAudioGenerator _audioGenerator;
    private readonly ILogger<SystemAudioPromptService> _logger;

    public SystemAudioPromptService(
        AppDbContext db,
        FallbackQuestionAudioGenerator audioGenerator,
        ILogger<SystemAudioPromptService> logger)
    {
        _db = db;
        _audioGenerator = audioGenerator;
        _logger = logger;
    }

    public async Task EnsureAllAsync(CancellationToken cancellationToken)
    {
        var prompts = new[]
        {
            SystemAudioCatalog.FirstEntry,
            SystemAudioCatalog.Enabled,
            SystemAudioCatalog.Disabled
        };

        var changed = 0;
        foreach (var key in prompts)
        {
            changed += await EnsurePromptAsync(key, cancellationToken) ? 1 : 0;
        }

        if (changed > 0)
            _logger.LogInformation("System audio prompts generated/restored: {Count}.", changed);
    }

    public async Task<bool> EnsurePromptAsync(
        string key,
        CancellationToken cancellationToken)
    {
        var prompt = GetPrompt(key);
        var hash = QuestionAudioTextBuilder.HashText(prompt.Text);

        var existing = await _db.SystemAudios
            .SingleOrDefaultAsync(x => x.Key == prompt.Key, cancellationToken);

        if (existing is not null &&
            existing.ContentHash == hash &&
            existing.AudioBytes.Length > 0)
        {
            return false;
        }

        var result = await _audioGenerator.GenerateTextAsync(
            prompt.Text,
            VoiceId,
            cancellationToken);

        if (result.Bytes.Length == 0)
            throw new InvalidOperationException(
                $"تعذر إنشاء رسالة الصوت النظامية: {prompt.Key}");

        if (existing is null)
        {
            _db.SystemAudios.Add(new SystemAudio
            {
                Key = prompt.Key,
                AudioBytes = result.Bytes,
                ContentHash = hash,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.AudioBytes = result.Bytes;
            existing.ContentHash = hash;
            existing.CreatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("System audio prompt generated/restored: {Key}.", prompt.Key);
        return true;
    }

    private static (string Key, string Text) GetPrompt(string key) => key switch
    {
        SystemAudioCatalog.FirstEntry => (SystemAudioCatalog.FirstEntry, "إذا بدك تشغيل الصوت، اضغط زر التشغيل."),
        SystemAudioCatalog.Enabled => (SystemAudioCatalog.Enabled, "الصوت سيبقى شغال حتى تضغط إيقاف."),
        SystemAudioCatalog.Disabled => (SystemAudioCatalog.Disabled, "الصوت متوقف."),
        _ => throw new ArgumentException("رسالة صوت نظامية غير معروفة.", nameof(key))
    };
}
