using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

/// <summary>
/// In-memory read cache for the relatively small, mostly-static question bank.
/// Admin mutations invalidate it, so normal student traffic does not repeatedly
/// query PostgreSQL for the same 397-ish questions.
/// </summary>
public static class QuestionBankCache
{
    private static readonly SemaphoreSlim LoadLock = new(1, 1);
    private static IReadOnlyList<Question> _questions = Array.Empty<Question>();
    private static int _initialized;

    public static int Count => Volatile.Read(ref _questions).Count;

    public static async Task InitializeAsync(AppDbContext db)
    {
        await GetAllAsync(db);
    }

    public static async Task<IReadOnlyList<Question>> GetAllAsync(AppDbContext db)
    {
        var cached = Volatile.Read(ref _questions);
        if (Volatile.Read(ref _initialized) == 1) return cached;

        await LoadLock.WaitAsync();
        try
        {
            cached = Volatile.Read(ref _questions);
            if (Volatile.Read(ref _initialized) == 1) return cached;

            var loaded = await db.Questions
                .AsNoTracking()
                .OrderBy(q => q.Id)
                .ToListAsync();

            Volatile.Write(ref _questions, loaded);
            Volatile.Write(ref _initialized, 1);
            return loaded;
        }
        finally
        {
            LoadLock.Release();
        }
    }

    public static async Task<IReadOnlyList<Question>> GetCategoryAsync(
        AppDbContext db,
        QuestionCategory category)
    {
        var all = await GetAllAsync(db);
        return all.Where(q => q.Category == category).ToList();
    }

    public static void Invalidate()
    {
        Volatile.Write(ref _questions, Array.Empty<Question>());
        Volatile.Write(ref _initialized, 0);
    }
}
