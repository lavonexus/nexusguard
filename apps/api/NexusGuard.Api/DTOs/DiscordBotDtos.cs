namespace NexusGuard.Api.DTOs;

// Bot-facing (authenticated with the shared X-Bot-Secret header, see DiscordBotController) -
// distinct from the admin-facing CreateScanRequest/ScanSessionResponse, since the bot never
// holds a per-server API key (see DiscordGuildLink's own comment for why).

public record LinkGuildRequest(string ApiKey, long GuildId);

// discordUserId/Username/AvatarUrl come straight from Discord's own API as a normal part of
// the admin running /nexusguard-scan @user in their Discord client - not read from the
// scanned player's machine.
public record CreateBotScanRequest(
    long GuildId, string? PlayerIdentifier, string DiscordUserId, string DiscordUsername, string? DiscordAvatarUrl);
