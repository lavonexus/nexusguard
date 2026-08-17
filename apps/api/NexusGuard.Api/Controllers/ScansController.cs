using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Controllers;

// All endpoints here act on behalf of the Server resolved from the caller's API key
// (see ApiKeyAuthenticationHandler) - a server can only ever see or create scans for itself.
[ApiController]
[Route("api/scans")]
[Authorize(AuthenticationSchemes = ApiKeyAuthenticationOptions.SchemeName)]
public class ScansController : ControllerBase
{
    private readonly NexusGuardDbContext _db;
    private readonly IScanSessionService _scanSessions;

    public ScansController(NexusGuardDbContext db, IScanSessionService scanSessions)
    {
        _db = db;
        _scanSessions = scanSessions;
    }

    [HttpPost]
    public async Task<ActionResult<CreateScanResponse>> Create(CreateScanRequest request)
    {
        var serverId = CallerServerId();

        var server = await _db.Servers.FindAsync(serverId);
        if (server is null) return NotFound();

        // Free plan (including an expired paid grant - see Server.EffectivePlan) is capped at
        // one scan per rolling 24 hours since their last scan, not a calendar-day reset - a
        // scan at 23:50 and another at 00:10 the same "day" would otherwise both be allowed.
        // Paid plans have no scan-count limit of their own.
        if (server.EffectivePlan == "Free")
        {
            var windowStartUtc = DateTime.UtcNow.AddHours(-24);
            var scansInWindow = await _db.ScanSessions.CountAsync(
                s => s.ServerId == serverId && s.CreatedAt >= windowStartUtc);
            if (scansInWindow >= 1)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests,
                    "Free planda 24 saatte 1 tarama hakkınız var. Daha fazla tarama için bir paket satın alın (Discord: https://discord.gg/nexusguard).");
            }
        }

        // Opportunistic: if the browser also happens to be carrying a valid dashboard
        // session cookie (it does, once the admin has ever signed in with Discord/Google),
        // attribute this scan to that person for the "who scans the most" leaderboard. The
        // API key remains the actual authorization - this never blocks scan creation.
        var sessionAuth = await HttpContext.AuthenticateAsync(DashboardSessionAuthenticationOptions.SchemeName);
        var createdByUserId = Guid.TryParse(
            sessionAuth.Principal?.FindFirst(DashboardSessionClaimTypes.UserId)?.Value, out var uid)
            ? uid
            : (Guid?)null;

        var (session, pin) = await _scanSessions.CreateAsync(serverId, request.PlayerIdentifier, createdByUserId);

        // The PIN is handed to whoever will run Scanner.exe (admin reads it out, or it's
        // relayed via the Discord bot in Phase 6) - it is never sent to the scanner directly.
        return CreatedAtAction(nameof(Get), new { id = session.Id },
            new CreateScanResponse(session.Id, pin, session.PinExpiresAt));
    }

    [HttpGet]
    public async Task<ActionResult<List<ScanSessionResponse>>> List()
    {
        var serverId = CallerServerId();

        var query = _db.ScanSessions
            .Include(s => s.CreatedByUser)
            .Where(s => s.ServerId == serverId);

        var restrictToCallerId = await ResolveVisibilityRestrictionAsync(serverId);
        if (restrictToCallerId.HasValue)
            query = query.Where(s => s.CreatedByUserId == restrictToCallerId.Value);

        var sessions = await query
            .OrderByDescending(s => s.CreatedAt)
            .Take(100)
            .ToListAsync();

        return sessions.Select(ToResponse).ToList();
    }

    // Enterprise-only restriction: a plain Member (not the Owner, not a Manager) only sees
    // scans they created themselves, unless the owner has widened this via
    // Server.ShowAllScansToMembers (see /team/settings). Returns the caller's own user id to
    // filter by, or null if no restriction applies (Owner, Manager, non-Enterprise plan, or no
    // resolvable session identity at all - e.g. a bare API-key call with no session cookie).
    private async Task<Guid?> ResolveVisibilityRestrictionAsync(Guid serverId)
    {
        var sessionAuth = await HttpContext.AuthenticateAsync(DashboardSessionAuthenticationOptions.SchemeName);
        if (!Guid.TryParse(sessionAuth.Principal?.FindFirst(DashboardSessionClaimTypes.UserId)?.Value, out var callerId))
            return null;

        var server = await _db.Servers.FindAsync(serverId);
        if (server is null || server.EffectivePlan != "Enterprise" || server.ShowAllScansToMembers)
            return null;

        if (callerId == server.OwnerUserId)
            return null;

        var member = await _db.ServerMembers.FirstOrDefaultAsync(m => m.ServerId == serverId && m.UserId == callerId);
        if (member is null || member.Role == "Manager")
            return null;

        return callerId;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ScanSessionDetailResponse>> Get(Guid id)
    {
        var serverId = CallerServerId();

        var session = await _db.ScanSessions
            .Include(s => s.Results)
            .Include(s => s.Detections)
            .Include(s => s.CreatedByUser)
            .FirstOrDefaultAsync(s => s.Id == id && s.ServerId == serverId);

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

        return new ScanSessionDetailResponse(ToResponse(session), results, detections);
    }

    private Guid CallerServerId() =>
        Guid.Parse(User.FindFirst(ApiKeyClaimTypes.ServerId)!.Value);

    private static ScanSessionResponse ToResponse(ScanSession s) => new(
        s.Id, s.PlayerIdentifier, s.Status.ToString(), s.RiskScore, s.AiSummary, s.CreatedAt, s.StartedAt, s.CompletedAt,
        s.DiscordUserId, s.DiscordUsername, s.DiscordAvatarUrl, s.SteamId64, s.SteamUsername, s.SteamAvatarUrl,
        s.CreatedByUser?.Username);
}
