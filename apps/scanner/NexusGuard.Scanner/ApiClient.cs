using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace NexusGuard.Scanner;

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

    public async Task<SessionResponse> ExchangeSessionAsync(Guid scanId, string pin)
    {
        var res = await _http.PostAsJsonAsync("/api/scanner/session", new SessionRequest(scanId, pin), JsonOptions);
        await EnsureSuccess(res, "exchanging PIN for a scan token");
        return (await res.Content.ReadFromJsonAsync<SessionResponse>(JsonOptions))!;
    }

    // Used by the GUI: the player only ever types a PIN, never a scan ID.
    public async Task<SessionResponse> ExchangeSessionByPinAsync(string pin)
    {
        var res = await _http.PostAsJsonAsync("/api/scanner/session/by-pin", new SessionByPinRequest(pin), JsonOptions);
        await EnsureSuccess(res, "exchanging PIN for a scan token");
        return (await res.Content.ReadFromJsonAsync<SessionResponse>(JsonOptions))!;
    }

    public async Task SendHeartbeatAsync(string scanToken)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/scanner/heartbeat");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", scanToken);
        var res = await _http.SendAsync(req);
        await EnsureSuccess(res, "sending heartbeat");
    }

    public async Task SubmitResultAsync(string scanToken, string resultType, string dataJson)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/scanner/results")
        {
            Content = JsonContent.Create(new ResultRequest(resultType, dataJson), options: JsonOptions),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", scanToken);
        var res = await _http.SendAsync(req);
        await EnsureSuccess(res, $"submitting {resultType} result");
    }

    public async Task<SubmitFileResponse> SubmitFileAsync(string scanToken, string fileName, byte[] content)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/scanner/files")
        {
            Content = JsonContent.Create(
                new SubmitFileRequest(fileName, Convert.ToBase64String(content)), options: JsonOptions),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", scanToken);
        var res = await _http.SendAsync(req);
        await EnsureSuccess(res, $"submitting {fileName} for YARA scanning");
        return (await res.Content.ReadFromJsonAsync<SubmitFileResponse>(JsonOptions))!;
    }

    public async Task<CompleteResponse> CompleteAsync(string scanToken)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/scanner/complete");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", scanToken);
        var res = await _http.SendAsync(req);
        await EnsureSuccess(res, "completing scan");
        return (await res.Content.ReadFromJsonAsync<CompleteResponse>(JsonOptions))!;
    }

    private static async Task EnsureSuccess(HttpResponseMessage res, string action)
    {
        if (res.IsSuccessStatusCode) return;
        var body = await res.Content.ReadAsStringAsync();
        throw new InvalidOperationException(
            $"API call failed while {action}: {(int)res.StatusCode} {res.ReasonPhrase} - {body}");
    }
}
