using System.Net.Http.Json;
using System.Text.Json;

namespace NexusGuard.Bot;

public record CreateScanResult(Guid ScanId, string Pin, DateTime PinExpiresAt);

// Talks to NexusGuard.Api's bot-only endpoints (api/discord/*), authenticated by a single
// shared secret instead of a per-server API key - the bot never holds or persists an API key
// past the one /link call that validates it (see DiscordGuildLink's own comment on the API
// side for why: a local file on Render's ephemeral filesystem isn't durable storage).
public class ApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly HttpClient _http;

    public ApiClient(string baseUrl, string botSecret)
    {
        _http = new HttpClient { BaseAddress = new Uri(baseUrl) };
        _http.DefaultRequestHeaders.Add("X-Bot-Secret", botSecret);
    }

    // Validates the API key server-side and durably links this guild to the server it
    // belongs to - returns false if the key doesn't check out, true once linked.
    public async Task<bool> LinkGuildAsync(string apiKey, ulong guildId)
    {
        var res = await _http.PostAsJsonAsync("/api/discord/link", new { apiKey, guildId }, JsonOptions);
        return res.IsSuccessStatusCode;
    }

    public async Task<CreateScanResult> CreateScanAsync(
        ulong guildId, string? playerIdentifier, ulong discordUserId, string discordUsername, string? discordAvatarUrl,
        ulong? invokerDiscordUserId = null)
    {
        var res = await _http.PostAsJsonAsync(
            "/api/discord/scans",
            new
            {
                guildId, playerIdentifier, discordUserId = discordUserId.ToString(), discordUsername, discordAvatarUrl,
                invokerDiscordUserId = invokerDiscordUserId?.ToString(),
            },
            JsonOptions);

        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Creating scan failed: {(int)res.StatusCode} {body}");
        }

        return (await res.Content.ReadFromJsonAsync<CreateScanResult>(JsonOptions))!;
    }
}
