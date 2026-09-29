using DrivingTestApi.Data;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Services;

public static class QuestionCountCache
{
    private static int _total;
    private static int _initialized;
    private static readonly SemaphoreSlim InitLock = new(1, 1);

    public static int Total => Volatile.Read(ref _total);

    public static async Task InitializeAsync(AppDbContext db)
    {
        if (Volatile.Read(ref _initialized) == 1)
            return;

        await InitLock.WaitAsync();
        try
        {
            if (Volatile.Read(ref _initialized) == 1)
                return;

            var total = await db.Questions.AsNoTracking().CountAsync();
            Volatile.Write(ref _total, total);
            Volatile.Write(ref _initialized, 1);
        }
        finally
        {
            InitLock.Release();
        }
    }

    public static void ApplyChanges(int added, int deleted)
    {
        if (Volatile.Read(ref _initialized) == 1)
            Interlocked.Add(ref _total, added - deleted);
    }
}
