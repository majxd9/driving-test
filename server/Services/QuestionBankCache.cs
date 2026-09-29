using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

/// <summary>
/// In-memory read cache keyed by question category.
/// Student requests load only the category they need.
/// </summary>
public static class QuestionBankCache
{
    private static readonly SemaphoreSlim LoadLock = new(1, 1);
    private static readonly object Sync = new();
    private static readonly Dictionary<QuestionCategory, IReadOnlyList<Question>> Categories = new();

    public static async Task<IReadOnlyList<Question>> GetCategoryAsync(
        AppDbContext db,
        QuestionCategory category)
    {
        lock (Sync)
        {
            if (Categories.TryGetValue(category, out var cached))
                return cached;
        }

        await LoadLock.WaitAsync();
        try
        {
            lock (Sync)
            {
                if (Categories.TryGetValue(category, out var cached))
                    return cached;
            }

            var loaded = await db.Questions
                .AsNoTracking()
                .Where(q => q.Category == category)
                .OrderBy(q => q.Id)
                .ToListAsync();

            lock (Sync)
            {
                Categories[category] = loaded;
                return loaded;
            }
        }
        finally
        {
            LoadLock.Release();
        }
    }

    public static void Invalidate()
    {
        lock (Sync)
            Categories.Clear();
    }
}
