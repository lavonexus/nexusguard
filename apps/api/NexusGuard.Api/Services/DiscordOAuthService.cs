using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NexusGuard.Api.Services;

public class DiscordOAuthService : IDiscordOAuthService
{
    private readonly HttpClient _http;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _redirectUri;

    public DiscordOAuthService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _http.BaseAddress = new Uri("https://discord.com/api/");

        _clientId = config["Discord:ClientId"]
            ?? throw new InvalidOperationException("Discord:ClientId is not configured.");
        _clientSecret = config["Discord:ClientSecret"]
            ?? throw new InvalidOperationException("Discord:ClientSecret is not configured (set it via user-secrets).");
        _redirectUri = config["Discord:RedirectUri"]
            ?? throw new InvalidOperationException("Discord:RedirectUri is not configured.");
    }

    public string BuildAuthorizeUrl(string state)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["redirect_uri"] = _redirectUri,
            ["response_type"] = "code",
            ["scope"] = "identify",
            ["state"] = state,
        };

        var queryString = string.Join("&", query.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
        return $"https://discord.com/api/oauth2/authorize?{queryString}";
    }

    public async Task<DiscordProfile> ExchangeCodeAsync(string code, CancellationToken ct = default)
    {
        var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret,
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _redirectUri,
        });

        var tokenResponse = await _http.PostAsync("oauth2/token", tokenRequest, ct);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            var body = await tokenResponse.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Discord token exchange failed: {(int)tokenResponse.StatusCode} {body}");
        }

        var token = await tokenResponse.Content.ReadFromJsonAsync<DiscordTokenResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Discord token exchange returned an empty body.");

        using var profileRequest = new HttpRequestMessage(HttpMethod.Get, "users/@me");
        profileRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);

        var profileResponse = await _http.SendAsync(profileRequest, ct);
        if (!profileResponse.IsSuccessStatusCode)
        {
            var body = await profileResponse.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Fetching Discord profile failed: {(int)profileResponse.StatusCode} {body}");
        }

        var profile = await profileResponse.Content.ReadFromJsonAsync<DiscordUserResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Discord profile response was empty.");

        return new DiscordProfile(profile.Id, profile.Username);
    }

    private record DiscordTokenResponse([property: JsonPropertyName("access_token")] string AccessToken);

    private record DiscordUserResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("username")] string Username);
}
