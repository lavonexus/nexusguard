using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Controllers;

// Everything here is gated behind IsSiteAdmin, not any Server ownership - this is the site
// owner's own control panel, reachable only by a dashboard session belonging to a user with
// IsSiteAdmin = true (see RequireSiteAdminAsync). There is no self-serve checkout in
// NexusGuard - a purchase happens over a Discord ticket, and granting/renewing a plan or
// handing out site-admin access is a manual action taken here after that payment is confirmed.
[ApiController]
[Route("api/admin")]
[Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
public class AdminController : ControllerBase
{
    private static readonly string[] ValidPlans = ["Free", "Pro", "ProDuo", "Enterprise"];
    private const int MinEnterpriseSeats = 5; // matches the flexible 5+ Enterprise pricing on /pricing

    private readonly NexusGuardDbContext _db;

    public AdminController(NexusGuardDbContext db) => _db = db;

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserResponse>>> ListUsers([FromQuery] string? query)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var users = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLower();
            users = users.Where(u =>
                u.Username.ToLower().Contains(q) ||
                (u.Email != null && u.Email.ToLower().Contains(q)));
        }

        var result = await users
            .OrderByDescending(u => u.CreatedAt)
            .Take(200)
            .Select(u => new AdminUserResponse(
                u.Id, u.Username, u.DisplayName, u.Email,
                u.DiscordId, u.GoogleId != null, u.IsSiteAdmin, u.CreatedAt))
            .ToListAsync();

        return result;
    }

    [HttpPost("site-admins")]
    public async Task<ActionResult<AdminUserResponse>> SetSiteAdmin(AdminSetSiteAdminRequest request)
    {
        var (forbidden, caller) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        if (string.IsNullOrWhiteSpace(request.Username))
            return BadRequest("Username is required.");

        var user = await _db.Users.FirstOrDefaultAsync(
            u => u.Username.ToLower() == request.Username.Trim().ToLower());
        if (user is null) return NotFound("No NexusGuard user with that username.");

        if (user.Id == caller!.Id && !request.IsSiteAdmin)
            return BadRequest("You can't remove your own site admin access.");

        user.IsSiteAdmin = request.IsSiteAdmin;
        await _db.SaveChangesAsync();

        return new AdminUserResponse(
            user.Id, user.Username, user.DisplayName, user.Email,
            user.DiscordId, user.GoogleId != null, user.IsSiteAdmin, user.CreatedAt);
    }

    [HttpGet("servers")]
    public async Task<ActionResult<List<AdminServerResponse>>> ListServers([FromQuery] string? query)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var servers = _db.Servers.Include(s => s.Owner).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLower();
            servers = servers.Where(s =>
                s.Name.ToLower().Contains(q) ||
                (s.Owner != null && s.Owner.Username.ToLower().Contains(q)));
        }

        var list = await servers.OrderByDescending(s => s.CreatedAt).Take(200).ToListAsync();
        var memberCounts = await _db.ServerMembers
            .Where(m => list.Select(s => s.Id).Contains(m.ServerId))
            .GroupBy(m => m.ServerId)
            .Select(g => new { ServerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ServerId, g => g.Count);

        return list.Select(s => new AdminServerResponse(
            s.Id, s.Name, s.OwnerUserId, s.Owner?.Username ?? "(bilinmiyor)",
            s.EffectivePlan, s.EnterpriseSeats, s.PlanExpiresAt,
            (memberCounts.TryGetValue(s.Id, out var c) ? c : 0) + 1, // +1 for the owner
            s.CreatedAt)).ToList();
    }

    // The one place Server.Plan/EnterpriseSeats/PlanExpiresAt actually change - after a
    // Discord-ticket purchase is confirmed, a site admin comes here and applies it by hand.
    [HttpPost("servers/{id:guid}/plan")]
    public async Task<ActionResult<AdminServerResponse>> SetPlan(Guid id, AdminSetPlanRequest request)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        if (!ValidPlans.Contains(request.Plan))
            return BadRequest($"Plan must be one of: {string.Join(", ", ValidPlans)}.");

        if (request.Plan == "Enterprise" && (request.EnterpriseSeats is null || request.EnterpriseSeats.Value < MinEnterpriseSeats))
            return BadRequest($"Enterprise plans require at least {MinEnterpriseSeats} seats.");

        if (request.DurationDays is < 1)
            return BadRequest("DurationDays must be positive, or omitted for an indefinite grant.");

        var server = await _db.Servers.Include(s => s.Owner).FirstOrDefaultAsync(s => s.Id == id);
        if (server is null) return NotFound();

        // A fresh Enterprise grant sends the owner through a one-time "name your server"
        // screen on their next login, instead of the auto-generated placeholder a Free signup
        // gets silently - re-saving an already-Enterprise server (e.g. changing seat count)
        // doesn't re-trigger it.
        if (request.Plan == "Enterprise" && server.Plan != "Enterprise")
            server.NeedsSetup = true;

        server.Plan = request.Plan;
        server.EnterpriseSeats = request.Plan == "Enterprise" ? request.EnterpriseSeats : null;
        server.PlanExpiresAt = request.Plan == "Free"
            ? null
            : request.DurationDays.HasValue ? DateTime.UtcNow.AddDays(request.DurationDays.Value) : (DateTime?)null;

        await _db.SaveChangesAsync();

        return await ToAdminServerResponseAsync(server);
    }

    // A plan doesn't have to run its course - a refund, a chargeback, a ticket resolved in the
    // customer's favor, or just a mistake all need this to take effect immediately rather than
    // waiting for PlanExpiresAt. Distinct from SetPlan(Plan: "Free") only in that it's a single
    // click with no form to fill in - same underlying effect either way.
    [HttpPost("servers/{id:guid}/cancel-plan")]
    public async Task<ActionResult<AdminServerResponse>> CancelPlan(Guid id)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var server = await _db.Servers.Include(s => s.Owner).FirstOrDefaultAsync(s => s.Id == id);
        if (server is null) return NotFound();

        server.Plan = "Free";
        server.EnterpriseSeats = null;
        server.PlanExpiresAt = null;

        await _db.SaveChangesAsync();

        return await ToAdminServerResponseAsync(server);
    }

    // Lets a site admin manage a customer's Enterprise team directly - e.g. a Discord ticket
    // asks to add/remove someone and the owner isn't around/available to do it themselves. This
    // bypasses the owner/manager-only checks ServersController.AddMember/RemoveMember enforce
    // for a normal caller, on purpose - a site admin already has full authority over every
    // server's plan/seats here, so the same trust extends to who's actually on the team.
    [HttpGet("servers/{id:guid}/members")]
    public async Task<ActionResult<List<ServerMemberResponse>>> ListServerMembers(Guid id)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();

        var owner = await _db.Users.FindAsync(server.OwnerUserId);
        var members = await _db.ServerMembers
            .Include(m => m.User)
            .Where(m => m.ServerId == id)
            .OrderBy(m => m.AddedAt)
            .ToListAsync();

        var scanStats = await _db.ScanSessions
            .Where(s => s.ServerId == id && s.CreatedByUserId != null)
            .GroupBy(s => s.CreatedByUserId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count(), LastActive = g.Max(s => s.CreatedAt) })
            .ToDictionaryAsync(g => g.UserId);

        var result = new List<ServerMemberResponse>();
        if (owner is not null)
        {
            var os = scanStats.GetValueOrDefault(owner.Id);
            result.Add(new ServerMemberResponse(owner.Id, owner.Id, owner.Username, "Owner", server.CreatedAt, os?.Count ?? 0, os?.LastActive));
        }
        result.AddRange(members.Select(m =>
        {
            var s = scanStats.GetValueOrDefault(m.UserId);
            return new ServerMemberResponse(m.Id, m.UserId, m.User?.Username ?? "(bilinmiyor)", m.Role, m.AddedAt, s?.Count ?? 0, s?.LastActive);
        }));

        return result;
    }

    [HttpPost("servers/{id:guid}/members")]
    public async Task<ActionResult<ServerMemberResponse>> AddServerMember(Guid id, AddMemberRequest request)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (server.EffectivePlan != "Enterprise")
            return BadRequest("Team members require an active Enterprise plan.");

        var identifier = request.Identifier?.Trim();
        if (string.IsNullOrWhiteSpace(identifier))
            return BadRequest("A Discord username, Discord ID, or Google email is required.");

        var isEmail = identifier.Contains('@');
        var isDiscordId = !isEmail && identifier.All(char.IsDigit);
        var user = isEmail
            ? await _db.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == identifier.ToLower())
            : isDiscordId
                ? await _db.Users.FirstOrDefaultAsync(u => u.DiscordId == identifier)
                : await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == identifier.ToLower());

        if (user is null)
        {
            return NotFound(isEmail
                ? "No NexusGuard user with that email - they need to sign in with Google at least once first."
                : isDiscordId
                    ? "No NexusGuard user with that Discord ID - they need to sign in with Discord at least once first."
                    : "No NexusGuard user with that Discord username - they need to sign in with Discord at least once first.");
        }

        if (user.Id == server.OwnerUserId)
            return BadRequest("That user already owns this server.");

        var alreadyMember = await _db.ServerMembers.AnyAsync(m => m.ServerId == id && m.UserId == user.Id);
        if (alreadyMember)
            return BadRequest("That user is already a member of this server.");

        var seats = server.EnterpriseSeats ?? 0;
        var currentMemberCount = await _db.ServerMembers.CountAsync(m => m.ServerId == id);
        if (currentMemberCount + 1 >= seats)
            return BadRequest($"This server's Enterprise plan is limited to {seats} people (including the owner) - remove someone first or raise the seat count from Sunucular & Planlar.");

        var member = new ServerMember
        {
            Id = Guid.NewGuid(),
            ServerId = id,
            UserId = user.Id,
            Role = "Member",
            AddedAt = DateTime.UtcNow,
        };

        _db.ServerMembers.Add(member);
        await _db.SaveChangesAsync();

        return new ServerMemberResponse(member.Id, user.Id, user.Username, member.Role, member.AddedAt, 0, null);
    }

    [HttpDelete("servers/{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveServerMember(Guid id, Guid memberId)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var member = await _db.ServerMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ServerId == id);
        if (member is null) return NotFound();

        _db.ServerMembers.Remove(member);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<AdminServerResponse> ToAdminServerResponseAsync(Server server)
    {
        var memberCount = await _db.ServerMembers.CountAsync(m => m.ServerId == server.Id);
        return new AdminServerResponse(
            server.Id, server.Name, server.OwnerUserId, server.Owner?.Username ?? "(bilinmiyor)",
            server.EffectivePlan, server.EnterpriseSeats, server.PlanExpiresAt, memberCount + 1, server.CreatedAt);
    }

    // Cross-server: unlike ScansController (scoped to whichever server the caller's own API
    // key belongs to), a site admin can see every scan any server has ever run.
    [HttpGet("scans")]
    public async Task<ActionResult<List<AdminScanSummaryResponse>>> ListScans(
        [FromQuery] string? query, [FromQuery] string? status)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var scans = _db.ScanSessions
            .Include(s => s.Server)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Detections)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLower();
            scans = scans.Where(s =>
                s.PlayerIdentifier.ToLower().Contains(q) ||
                (s.Server != null && s.Server.Name.ToLower().Contains(q)) ||
                (s.CreatedByUser != null && s.CreatedByUser.Username.ToLower().Contains(q)));
        }

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<ScanSessionStatus>(status, ignoreCase: true, out var statusFilter))
        {
            scans = scans.Where(s => s.Status == statusFilter);
        }

        var list = await scans.OrderByDescending(s => s.CreatedAt).Take(200).ToListAsync();

        return list.Select(ToAdminScanSummary).ToList();
    }

    [HttpGet("scans/{id:guid}")]
    public async Task<ActionResult<AdminScanDetailResponse>> GetScan(Guid id)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var session = await _db.ScanSessions
            .Include(s => s.Server)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Results)
            .Include(s => s.Detections)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session is null) return NotFound();

        var results = session.Results
            .OrderBy(r => r.CreatedAt)
            .Select(r => new ScanResultSummaryResponse(r.Id, r.ResultType.ToString(), r.DataJson, r.CreatedAt))
            .ToList();

        var detections = session.Detections
            .OrderByDescending(d => d.Weight)
            .Select(d => new DetectionResponse(
                d.Id, d.RuleId, d.Description, d.Weight, d.Evidence, d.CreatedAt,
                d.Category, d.Status, d.Confidence, d.Sha256, d.Publisher, d.Signed, d.FirstSeenUtc, d.LastModifiedUtc))
            .ToList();

        return new AdminScanDetailResponse(ToAdminScanSummary(session), results, detections);
    }

    // Irreversible - cascades to the scan's own Results and Detections (see
    // NexusGuardDbContext's Cascade config on both). Deliberately not exposed on the
    // per-server ScansController: a server owner can see their own player's scans but never
    // erase them, since that's evidence of the very thing NexusGuard exists to catch. Only the
    // site admin can, for cleaning up test/bad data or acting on a takedown/privacy request.
    [HttpDelete("scans/{id:guid}")]
    public async Task<IActionResult> DeleteScan(Guid id)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var session = await _db.ScanSessions.FindAsync(id);
        if (session is null) return NotFound();

        _db.ScanSessions.Remove(session);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static AdminScanSummaryResponse ToAdminScanSummary(ScanSession s) => new(
        s.Id, s.PlayerIdentifier, s.Status.ToString(), s.RiskScore, s.CreatedAt, s.CompletedAt,
        s.ServerId, s.Server?.Name ?? "(bilinmiyor)", s.CreatedByUser?.Username, s.Detections.Count);

    // Reactive safety net for the marketplace (Controllers/MarketplaceController.cs) - listings
    // and reviews publish immediately with no approval gate, so this is the only way to take
    // down something inappropriate (an offensive logo/title/comment) after the fact.
    [HttpDelete("marketplace/listings/{id:guid}")]
    public async Task<IActionResult> DeleteMarketplaceListing(Guid id)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var listing = await _db.MarketplaceListings.FindAsync(id);
        if (listing is null) return NotFound();

        _db.MarketplaceListings.Remove(listing);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("marketplace/reviews/{id:guid}")]
    public async Task<IActionResult> DeleteMarketplaceReview(Guid id)
    {
        var (forbidden, _) = await RequireSiteAdminAsync();
        if (forbidden is not null) return forbidden;

        var review = await _db.MarketplaceReviews.FindAsync(id);
        if (review is null) return NotFound();

        _db.MarketplaceReviews.Remove(review);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Always re-checked against the database rather than trusting a claim on the session
    // cookie, so revoking IsSiteAdmin takes effect on the caller's very next request instead
    // of only after their session expires.
    private async Task<(ActionResult? Forbidden, User? Caller)> RequireSiteAdminAsync()
    {
        // Bare Forbid() throws here (500, not 403) - this API has multiple auth schemes
        // configured with no DefaultForbidScheme, so ForbidAsync can't resolve which one to
        // challenge. StatusCode(403) sidesteps that entirely, same fix as everywhere else in
        // this codebase that hit the same trap.
        var claim = User.FindFirst(DashboardSessionClaimTypes.UserId)?.Value;
        if (!Guid.TryParse(claim, out var userId))
            return (StatusCode(StatusCodes.Status403Forbidden), null);

        var user = await _db.Users.FindAsync(userId);
        if (user is null || !user.IsSiteAdmin)
            return (StatusCode(StatusCodes.Status403Forbidden), null);

        return (null, user);
    }
}
