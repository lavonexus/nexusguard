using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Controllers;

// Ingest endpoints for the user's separate Discord ticket bot (C:\Users\PC\Desktop\nexus-
// ticketbot, not part of this repo) - authenticated by its own shared secret
// (X-Bot-Secret, Discord:TicketBotSharedSecret), deliberately distinct from the scan-bot's
// secret in DiscordBotController so a leak of one can never impersonate the other.
//
// Closing a ticket on Discord's side permanently deletes the channel a few seconds later, so
// the bot pushes every open/message/close/reopen event here as it happens - this is the only
// way the dashboard ever gets to keep ticket history around after Discord itself throws it away.
[ApiController]
[Route("api/discord/tickets")]
public class DiscordTicketBotController : ControllerBase
{
    private readonly NexusGuardDbContext _db;
    private readonly string? _botSecret;

    public DiscordTicketBotController(NexusGuardDbContext db, IConfiguration config)
    {
        _db = db;
        _botSecret = config["Discord:TicketBotSharedSecret"];
    }

    [HttpPost]
    public async Task<IActionResult> OpenTicket(OpenTicketRequest request)
    {
        if (!IsAuthorizedBot()) return StatusCode(StatusCodes.Status403Forbidden);

        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.DiscordChannelId == request.DiscordChannelId);
        if (ticket is null)
        {
            ticket = new SupportTicket { Id = Guid.NewGuid(), DiscordChannelId = request.DiscordChannelId };
            _db.SupportTickets.Add(ticket);
        }

        ticket.DiscordGuildId = request.DiscordGuildId;
        ticket.TicketNumber = request.TicketNumber;
        ticket.Category = request.Category;
        ticket.DiscordUserId = request.DiscordUserId;
        ticket.Status = SupportTicketStatus.Open;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{channelId}/messages")]
    public async Task<IActionResult> AddMessage(string channelId, TicketMessageRequest request)
    {
        if (!IsAuthorizedBot()) return StatusCode(StatusCodes.Status403Forbidden);

        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.DiscordChannelId == channelId);
        if (ticket is null) return NotFound("No ticket is tracked for that channel yet.");

        var exists = await _db.SupportTicketMessages.AnyAsync(
            m => m.SupportTicketId == ticket.Id && m.DiscordMessageId == request.DiscordMessageId);
        if (exists) return NoContent();

        _db.SupportTicketMessages.Add(new SupportTicketMessage
        {
            Id = Guid.NewGuid(),
            SupportTicketId = ticket.Id,
            DiscordMessageId = request.DiscordMessageId,
            AuthorDiscordId = request.AuthorDiscordId,
            AuthorUsername = request.AuthorUsername,
            AuthorAvatarUrl = request.AuthorAvatarUrl,
            IsStaff = request.IsStaff,
            Content = request.Content,
            CreatedAt = request.CreatedAt,
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{channelId}/close")]
    public async Task<IActionResult> CloseTicket(string channelId, CloseTicketRequest request)
    {
        if (!IsAuthorizedBot()) return StatusCode(StatusCodes.Status403Forbidden);

        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.DiscordChannelId == channelId);
        if (ticket is null) return NotFound();

        ticket.Status = SupportTicketStatus.Closed;
        ticket.ClosedAt = request.ClosedAt;
        ticket.ClosedByUsername = request.ClosedByUsername;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{channelId}/reopen")]
    public async Task<IActionResult> ReopenTicket(string channelId)
    {
        if (!IsAuthorizedBot()) return StatusCode(StatusCodes.Status403Forbidden);

        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.DiscordChannelId == channelId);
        if (ticket is null) return NotFound();

        ticket.Status = SupportTicketStatus.Open;
        ticket.ClosedAt = null;
        ticket.ClosedByUsername = null;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    private bool IsAuthorizedBot()
    {
        Request.Headers.TryGetValue("X-Bot-Secret", out var provided);
        return BotSecretAuth.Matches(provided.ToString(), _botSecret);
    }
}
