using System.Threading.Channels;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class AuthLogQueue : IAuthLogQueue
{
    private readonly Channel<AuthLog> _channel =
        Channel.CreateUnbounded<AuthLog>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
                AllowSynchronousContinuations = false
            });

    public bool TryEnqueue(AuthLog log) => _channel.Writer.TryWrite(log);

    public IAsyncEnumerable<AuthLog> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
