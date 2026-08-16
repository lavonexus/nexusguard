namespace NexusGuard.Api.Models;

public class SupportTicketMessage
{
    public Guid Id { get; set; }

    public Guid SupportTicketId { get; set; }
    public SupportTicket? SupportTicket { get; set; }

    // Unique per ticket - lets the bot safely retry a push after a network blip without
    // double-inserting the same Discord message. String, not a numeric type - see
    // SupportTicket.DiscordChannelId's own comment on why Discord snowflakes stay opaque strings.
    public string DiscordMessageId { get; set; } = string.Empty;

    public string AuthorDiscordId { get; set; } = string.Empty;
    public string AuthorUsername { get; set; } = string.Empty;
    public string? AuthorAvatarUrl { get; set; }

    // True for the staff role or the bot's temporary "Destek" impersonation webhook - see
    // events/messageCreate.js in the ticket bot repo for exactly how this is decided.
    public bool IsStaff { get; set; }

    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
