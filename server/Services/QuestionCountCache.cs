using DrivingTestApi.Data;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

/// <summary>
/// Keeps the total question-bank count in memory so normal requests do not
/// repeatedly execute SELECT COUNT(*) against PostgreSQL.
/// The value is initialized once at startup and adjusted only when questions
/// are added/deleted through this application's DbContext.
/// </summary>
public static class QuestionCountCache
{
    private static int _total;
    private static bool _initialized;
    private static readonly SemaphoreSlim InitLock = new(1, 1);

    public static int Total => Volatile.Read(ref _total);

    public static async Task InitializeAsync(AppDbContext db)
    {
        if (_initialized)
            return;

        await InitLock.WaitAsync();
        try
        {
            if (_initialized)
                return;

            _total = await db.Questions.AsNoTracking().CountAsync();
            _initialized = true;
        }
        finally
        {
            InitLock.Release();
        }
    }

    public static void ApplyChanges(int added, int deleted)
    {
        if (!_initialized)
            return;

        Interlocked.Add(ref _total, added - deleted);
    }
}
