using System.Net.Http.Headers;
using System.Text.Json.Serialization;

namespace NexusGuard.Api.Services;

// Same shape as DiscordOAuthService - a hand-rolled authorization-code exchange rather than
// the ASP.NET Google middleware, so both providers create a dashboard session through the
// exact same UserSessionService path. Needs Google:ClientId/ClientSecret via user-secrets
// (a real Google Cloud OAuth client - Claude can't create one on your behalf) before the
// login button actually works; until then Login() below throws on startup-config, same as
// Discord did before its secrets were added.
public class GoogleOAuthService : IGoogleOAuthService
{
    private readonly HttpClient _http;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _redirectUri;

    public GoogleOAuthService(HttpClient http, IConfiguration config)
    {
        _http = http;

        _clientId = config["Google:ClientId"]
            ?? throw new InvalidOperationException("Google:ClientId is not configured (set it via user-secrets).");
        _clientSecret = config["Google:ClientSecret"]
            ?? throw new InvalidOperationException("Google:ClientSecret is not configured (set it via user-secrets).");
        _redirectUri = config["Google:RedirectUri"]
            ?? throw new InvalidOperationException("Google:RedirectUri is not configured.");
    }

    public string BuildAuthorizeUrl(string state)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["redirect_uri"] = _redirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
        };

        var queryString = string.Join("&", query.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
        return $"https://accounts.google.com/o/oauth2/v2/auth?{queryString}";
    }

    public async Task<GoogleProfile> ExchangeCodeAsync(string code, CancellationToken ct = default)
    {
        var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret,
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _redirectUri,
        });

        var tokenResponse = await _http.PostAsync("https://oauth2.googleapis.com/token", tokenRequest, ct);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            var body = await tokenResponse.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Google token exchange failed: {(int)tokenResponse.StatusCode} {body}");
        }

        var token = await tokenResponse.Content.ReadFromJsonAsync<GoogleTokenResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Google token exchange returned an empty body.");

        using var profileRequest = new HttpRequestMessage(HttpMethod.Get, "https://openidconnect.googleapis.com/v1/userinfo");
        profileRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);

        var profileResponse = await _http.SendAsync(profileRequest, ct);
        if (!profileResponse.IsSuccessStatusCode)
        {
            var body = await profileResponse.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Fetching Google profile failed: {(int)profileResponse.StatusCode} {body}");
        }

        var profile = await profileResponse.Content.ReadFromJsonAsync<GoogleUserInfoResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Google profile response was empty.");

        return new GoogleProfile(profile.Sub, profile.Email, profile.Name);
    }

    private record GoogleTokenResponse([property: JsonPropertyName("access_token")] string AccessToken);

    private record GoogleUserInfoResponse(
        [property: JsonPropertyName("sub")] string Sub,
        [property: JsonPropertyName("email")] string Email,
        [property: JsonPropertyName("name")] string Name);
}
