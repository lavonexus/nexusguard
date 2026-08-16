namespace NexusGuard.Api.DTOs;

// --- Ticket-bot-facing (X-Bot-Secret, see DiscordTicketBotController) ---------------------

public record OpenTicketRequest(
    string DiscordChannelId, string DiscordGuildId, int TicketNumber, string Category, string DiscordUserId);

public record TicketMessageRequest(
    string DiscordMessageId, string AuthorDiscordId, string AuthorUsername, string? AuthorAvatarUrl,
    bool IsStaff, string Content, DateTime CreatedAt);

public record CloseTicketRequest(string ClosedByUsername, DateTime ClosedAt);

// --- Dashboard-facing (session cookie, see TicketsController) -----------------------------

public record SupportTicketSummaryResponse(
    Guid Id, int TicketNumber, string Category, string Status,
    DateTime OpenedAt, DateTime? ClosedAt, int MessageCount);

public record SupportTicketMessageResponse(
    Guid Id, string AuthorDiscordId, string AuthorUsername, string? AuthorAvatarUrl,
    bool IsStaff, string Content, DateTime CreatedAt);

public record SupportTicketDetailResponse(
    SupportTicketSummaryResponse Summary, List<SupportTicketMessageResponse> Messages);
