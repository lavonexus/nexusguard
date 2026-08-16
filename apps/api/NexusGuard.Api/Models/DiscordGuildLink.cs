namespace NexusGuard.Api.Models;

// Durable guild<->server mapping for the Discord bot (apps/bot/NexusGuard.Bot). Replaces the
// bot's old local-JSON-file link store, which was wiped on every restart once the bot moved to
// Render's ephemeral filesystem - this makes the bot fully stateless. Set once via
// POST /api/discord/link (after the bot validates the admin's API key), read on every
// POST /api/discord/scans so the bot never has to hold or remember a per-server API key.
public class DiscordGuildLink
{
    public long GuildId { get; set; }

    public Guid ServerId { get; set; }
    public Server? Server { get; set; }

    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;
}
