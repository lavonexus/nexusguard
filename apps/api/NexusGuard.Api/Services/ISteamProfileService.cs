namespace NexusGuard.Api.Services;

public record SteamProfile(string? Username, string? AvatarUrl);

public interface ISteamProfileService
{
    // Only ever looks up a SteamID64 the scanner already read from the local Steam client's
    // own registry key (see SteamScanner) - never resolves a username/vanity URL, never writes
    // anything back to Steam. Returns null fields (not a thrown exception) for a private
    // profile or an ID Steam doesn't recognize, since neither is an error condition worth
    // failing scan completion over.
    Task<SteamProfile> GetProfileAsync(string steamId64, CancellationToken ct = default);
}
