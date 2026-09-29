using System.Collections.Concurrent;
using DrivingTestApi.Data;
using DrivingTestApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

/// <summary>
/// In-memory read cache partitioned by question category.
/// A student request for one category only queries that category from PostgreSQL.
/// Admin mutations invalidate the category cache.
/// </summary>
public static class QuestionBankCache
{
    private static readonly SemaphoreSlim LoadLock = new(1, 1);
    private static readonly ConcurrentDictionary<QuestionCategory, IReadOnlyList<Question>> Categories = new();

    public static int Count => Categories.Values.Sum(list => list.Count);

    public static async Task InitializeAsync(AppDbContext db)
    {
        foreach (var category in Enum.GetValues<QuestionCategory>())
            await GetCategoryAsync(db, category);
    }

    public static async Task<IReadOnlyList<Question>> GetCategoryAsync(
        AppDbContext db,
        QuestionCategory category)
    {
        if (Categories.TryGetValue(category, out var cached))
            return cached;

        await LoadLock.WaitAsync();
        try
        {
            if (Categories.TryGetValue(category, out cached))
                return cached;

            var loaded = await db.Questions
                .AsNoTracking()
                .Where(q => q.Category == category)
                .OrderBy(q => q.Id)
                .ToListAsync();

            Categories[category] = loaded;
            return loaded;
        }
        finally
        {
            LoadLock.Release();
        }
    }

    public static async Task<IReadOnlyList<Question>> GetAllAsync(AppDbContext db)
    {
        var all = new List<Question>();

        foreach (var category in Enum.GetValues<QuestionCategory>())
            all.AddRange(await GetCategoryAsync(db, category));

        return all.OrderBy(q => q.Id).ToList();
    }

    public static void Invalidate()
    {
        Categories.Clear();
    }
}
