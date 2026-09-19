using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public interface IAuthLogQueue
{
    bool TryEnqueue(AuthLog log);
    IAsyncEnumerable<AuthLog> ReadAllAsync(CancellationToken cancellationToken);
}
