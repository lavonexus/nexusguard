using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace NexusGuard.Bot;

public record CreateScanResult(Guid ScanId, string Pin, DateTime PinExpiresAt);

// Talks to NexusGuard.Api the same way the dashboard does: X-Api-Key header, no different
// treatment for being a bot instead of a browser.
public class ApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly HttpClient _http;

    public ApiClient(string baseUrl)
    {
        _http = new HttpClient { BaseAddress = new Uri(baseUrl) };
    }

    public async Task<bool> ValidateApiKeyAsync(string apiKey)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/scans");
        req.Headers.Add("X-Api-Key", apiKey);
        var res = await _http.SendAsync(req);
        return res.IsSuccessStatusCode;
    }

    public async Task<CreateScanResult> CreateScanAsync(string apiKey, string playerIdentifier)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/scans")
        {
            Content = JsonContent.Create(new { playerIdentifier }, options: JsonOptions),
        };
        req.Headers.Add("X-Api-Key", apiKey);

        var res = await _http.SendAsync(req);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Creating scan failed: {(int)res.StatusCode} {body}");
        }

        return (await res.Content.ReadFromJsonAsync<CreateScanResult>(JsonOptions))!;
    }
}
