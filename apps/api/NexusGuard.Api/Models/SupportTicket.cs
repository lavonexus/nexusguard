namespace NexusGuard.Api.Models;

// Mirrors a Discord support ticket channel from the user's separate ticket bot
// (not part of this repo) - see Controllers/DiscordTicketBotController.cs. The bot pushes
// every open/message/close/reopen event here in real time because closing a ticket on
// Discord's side permanently deletes the channel a few seconds later; if we don't capture
// messages as they happen, the history is gone for good.
public class SupportTicket
{
    public Guid Id { get; set; }

    // Correlation key for every bot call - the Discord channel the ticket lives in. Stored as
    // a string, not a numeric type: Discord snowflakes are 64-bit and don't fit safely in a
    // JS `Number` (the ticket bot's own runtime) or round-trip losslessly through JSON as a
    // bare number - treating them as opaque strings end-to-end avoids that precision loss.
    public string DiscordChannelId { get; set; } = string.Empty;
    public string DiscordGuildId { get; set; } = string.Empty;

    // The bot's own incrementing ticket counter (┇{id}┇ in the channel name) - display-only.
    public int TicketNumber { get; set; }

    // Raw category from the bot's 3 panel buttons ("Teknik Destek"/"Satın Alım"/"Partnerlik") -
    // translated for display client-side, same as ScanSession's Decision literals.
    public string Category { get; set; } = string.Empty;

    // The ticket opener's Discord user ID (the bot sets this as the channel topic) - matched
    // against User.DiscordId to scope GET /api/tickets to the signed-in customer's own tickets.
    public string DiscordUserId { get; set; } = string.Empty;

    public SupportTicketStatus Status { get; set; } = SupportTicketStatus.Open;

    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public string? ClosedByUsername { get; set; }

    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}
