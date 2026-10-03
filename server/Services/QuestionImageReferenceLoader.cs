using System.Net.Http.Headers;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed record QuestionImageReference(byte[] Bytes, string ContentType, string SourceUrl);

public sealed class QuestionImageReferenceLoader
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public QuestionImageReferenceLoader(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<QuestionImageReference?> LoadAsync(
        Question question,
        CancellationToken cancellationToken)
    {
        var source = FirstImageSource(question);
        if (string.IsNullOrWhiteSpace(source))
            return null;

        if (source.StartsWith("/", StringComparison.Ordinal))
        {
            var origin = (_configuration["FrontendOrigin"] ?? string.Empty).TrimEnd('/');
            if (string.IsNullOrWhiteSpace(origin))
                throw new InvalidOperationException("لا يمكن تحميل صورة المرجع: FrontendOrigin غير مضبوط.");
            source = origin + source;
        }

        if (!Uri.TryCreate(source, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https"))
            throw new InvalidOperationException($"رابط صورة المرجع غير صالح: {source}");

        var client = _httpClientFactory.CreateClient("QuestionImageReference");
        using var response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"تعذر تحميل صورة المرجع للسؤال #{question.Id}: HTTP {(int)response.StatusCode}.");

        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (bytes.Length == 0)
            throw new InvalidOperationException($"صورة المرجع للسؤال #{question.Id} فارغة.");

        var contentType = response.Content.Headers.ContentType?.MediaType?.Trim();
        if (string.IsNullOrWhiteSpace(contentType) || !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            contentType = GuessContentType(source);

        if (!contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"الملف المرجعي للسؤال #{question.Id} ليس صورة صالحة.");

        return new QuestionImageReference(bytes, contentType, source);
    }

    private static string? FirstImageSource(Question question)
    {
        if (!string.IsNullOrWhiteSpace(question.ImageUrl))
            return question.ImageUrl.Trim();

        if (string.Equals(question.DiagramType, "image", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(question.DiagramUrl))
            return question.DiagramUrl.Trim();

        return null;
    }

    private static string GuessContentType(string value)
    {
        var path = value.Split('?', '#')[0].ToLowerInvariant();
        if (path.EndsWith(".webp")) return "image/webp";
        if (path.EndsWith(".jpg") || path.EndsWith(".jpeg")) return "image/jpeg";
        if (path.EndsWith(".gif")) return "image/gif";
        return "image/png";
    }
}
