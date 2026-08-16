using System.Text.Json.Serialization;

namespace NexusGuard.Api.Services;

// Wraps Steam's public Web API (ISteamUser/GetPlayerSummaries) - the same category of call
// NexusGuard already makes for Discord/Google avatars on the leaderboard, just a different
// provider. Requires a free Steam Web API key (steamcommunity.com/dev/apikey) configured as
// Steam:ApiKey - if it's missing, every lookup is skipped rather than throwing, since a scan
// with no Steam identity attached is a perfectly normal outcome (Steam wasn't running), not a
// server misconfiguration worth failing scan completion over.
public class SteamProfileService : ISteamProfileService
{
    private readonly HttpClient _http;
    private readonly string? _apiKey;

    public SteamProfileService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _http.BaseAddress = new Uri("https://api.steampowered.com/");
        _apiKey = config["Steam:ApiKey"];
    }

    public async Task<SteamProfile> GetProfileAsync(string steamId64, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey)) return new SteamProfile(null, null);

        try
        {
            var url = $"ISteamUser/GetPlayerSummaries/v0002/?key={Uri.EscapeDataString(_apiKey)}&steamids={Uri.EscapeDataString(steamId64)}";
            var response = await _http.GetFromJsonAsync<SteamSummariesResponse>(url, ct);
            var player = response?.Response?.Players?.FirstOrDefault();
            return new SteamProfile(player?.PersonaName, player?.AvatarFull);
        }
        catch
        {
            // Network blip, malformed ID, rate limit - a missing Steam identity is never worth
            // failing scan completion over.
            return new SteamProfile(null, null);
        }
    }

    private record SteamSummariesResponse([property: JsonPropertyName("response")] SteamSummariesInner? Response);
    private record SteamSummariesInner([property: JsonPropertyName("players")] List<SteamPlayer>? Players);
    private record SteamPlayer(
        [property: JsonPropertyName("personaname")] string? PersonaName,
        [property: JsonPropertyName("avatarfull")] string? AvatarFull);
}
