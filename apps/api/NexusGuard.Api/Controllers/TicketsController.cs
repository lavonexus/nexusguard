using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Controllers;

// Read-only "Biletlerim" view for the dashboard - a customer's own Discord support tickets,
// synced in from the separate ticket bot (see DiscordTicketBotController). Deliberately no
// write endpoints anywhere on this controller: replies only ever happen on Discord, this is
// a mirror, not a second inbox.
[ApiController]
[Route("api/tickets")]
[Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
public class TicketsController : ControllerBase
{
    private readonly NexusGuardDbContext _db;

    public TicketsController(NexusGuardDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<SupportTicketSummaryResponse>>> ListMine()
    {
        var discordId = await CallerDiscordIdAsync();
        if (discordId is null) return new List<SupportTicketSummaryResponse>();

        var tickets = await _db.SupportTickets
            .Include(t => t.Messages)
            .Where(t => t.DiscordUserId == discordId)
            .OrderByDescending(t => t.OpenedAt)
            .ToListAsync();

        return tickets.Select(ToSummary).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SupportTicketDetailResponse>> Get(Guid id)
    {
        var discordId = await CallerDiscordIdAsync();
        if (discordId is null) return NotFound();

        var ticket = await _db.SupportTickets
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket is null) return NotFound();
        if (ticket.DiscordUserId != discordId) return StatusCode(StatusCodes.Status403Forbidden);

        var messages = ticket.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportTicketMessageResponse(
                m.Id, m.AuthorDiscordId, m.AuthorUsername, m.AuthorAvatarUrl, m.IsStaff, m.Content, m.CreatedAt))
            .ToList();

        return new SupportTicketDetailResponse(ToSummary(ticket), messages);
    }

    private static SupportTicketSummaryResponse ToSummary(SupportTicket t) => new(
        t.Id, t.TicketNumber, t.Category, t.Status.ToString(), t.OpenedAt, t.ClosedAt, t.Messages.Count);

    // Null if the signed-in account has no linked Discord ID (e.g. a Google-only login) -
    // ticket ownership is keyed entirely by Discord ID, so there's nothing to match against.
    private async Task<string?> CallerDiscordIdAsync()
    {
        var claim = User.FindFirst(DashboardSessionClaimTypes.UserId)?.Value;
        if (!Guid.TryParse(claim, out var userId)) return null;

        var user = await _db.Users.FindAsync(userId);
        return user?.DiscordId;
    }
}
