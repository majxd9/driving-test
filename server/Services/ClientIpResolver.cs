using System.Net;
using System.Net.Sockets;

namespace DrivingTestApi.Services;

public interface IClientIpResolver
{
    string? GetClientIp(HttpContext context);
}

public sealed class ClientIpResolver(IConfiguration configuration) : IClientIpResolver
{
    private readonly HashSet<IPAddress> _trustedIps = ParseExactIps(configuration["TrustedProxyIPs"]);
    private readonly List<(IPAddress Network, int PrefixLength)> _trustedNetworks = ParseNetworks(configuration["TrustedProxyNetworks"]);

    public string? GetClientIp(HttpContext context)
    {
        var remote = context.Connection.RemoteIpAddress;
        if (remote is null) return null;

        if (IsTrustedProxy(remote))
        {
            var cloudflareIp = ParseHeaderAddress(context.Request.Headers["CF-Connecting-IP"]);
            if (cloudflareIp is not null) return cloudflareIp.ToString();

            var forwarded = ParseForwardedFor(context.Request.Headers["X-Forwarded-For"]);
            if (forwarded is not null) return forwarded.ToString();
        }

        return remote.ToString();
    }

    private bool IsTrustedProxy(IPAddress address) =>
        _trustedIps.Contains(address) || _trustedNetworks.Any(n => IsInNetwork(address, n.Network, n.PrefixLength));

    private static IPAddress? ParseHeaderAddress(string? value) =>
        IPAddress.TryParse(value?.Trim(), out var ip) ? ip : null;

    private static IPAddress? ParseForwardedFor(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        foreach (var item in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (IPAddress.TryParse(item, out var ip)) return ip;
        }

        return null;
    }

    private static HashSet<IPAddress> ParseExactIps(string? value)
    {
        var result = new HashSet<IPAddress>();
        if (string.IsNullOrWhiteSpace(value)) return result;

        foreach (var item in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            if (IPAddress.TryParse(item, out var ip)) result.Add(ip);

        return result;
    }

    private static List<(IPAddress Network, int PrefixLength)> ParseNetworks(string? value)
    {
        var result = new List<(IPAddress Network, int PrefixLength)>();
        if (string.IsNullOrWhiteSpace(value)) return result;

        foreach (var item in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var parts = item.Split('/', 2, StringSplitOptions.TrimEntries);
            if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var network) || !int.TryParse(parts[1], out var prefix))
                continue;

            var maxBits = network.AddressFamily == AddressFamily.InterNetwork ? 32 : 128;
            if (prefix >= 0 && prefix <= maxBits)
                result.Add((network, prefix));
        }

        return result;
    }

    private static bool IsInNetwork(IPAddress address, IPAddress network, int prefixLength)
    {
        if (address.AddressFamily != network.AddressFamily) return false;

        var addressBytes = address.GetAddressBytes();
        var networkBytes = network.GetAddressBytes();
        var fullBytes = prefixLength / 8;
        var remainingBits = prefixLength % 8;

        for (var i = 0; i < fullBytes; i++)
            if (addressBytes[i] != networkBytes[i]) return false;

        if (remainingBits == 0) return true;

        var mask = (byte)(0xFF << (8 - remainingBits));
        return (addressBytes[fullBytes] & mask) == (networkBytes[fullBytes] & mask);
    }
}
