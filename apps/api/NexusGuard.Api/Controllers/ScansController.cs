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
        // one scan per calendar day (UTC). Paid plans have no scan-count limit of their own.
        if (server.EffectivePlan == "Free")
        {
            var todayStartUtc = DateTime.UtcNow.Date;
            var scansToday = await _db.ScanSessions.CountAsync(
                s => s.ServerId == serverId && s.CreatedAt >= todayStartUtc);
            if (scansToday >= 1)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests,
                    "Free planda günde 1 tarama hakkınız var. Daha fazla tarama için bir paket satın alın (Discord: https://discord.gg/nexusguard).");
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

        var sessions = await _db.ScanSessions
            .Where(s => s.ServerId == serverId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(100)
            .ToListAsync();

        return sessions.Select(ToResponse).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ScanSessionDetailResponse>> Get(Guid id)
    {
        var serverId = CallerServerId();

        var session = await _db.ScanSessions
            .Include(s => s.Results)
            .Include(s => s.Detections)
            .FirstOrDefaultAsync(s => s.Id == id && s.ServerId == serverId);

        if (session is null) return NotFound();

        var results = session.Results
            .OrderBy(r => r.CreatedAt)
            .Select(r => new ScanResultSummaryResponse(r.Id, r.ResultType.ToString(), r.DataJson, r.CreatedAt))
            .ToList();

        var detections = session.Detections
            .OrderByDescending(d => d.Weight)
            .Select(d => new DetectionResponse(d.Id, d.RuleId, d.Description, d.Weight, d.Evidence, d.CreatedAt))
            .ToList();

        return new ScanSessionDetailResponse(ToResponse(session), results, detections);
    }

    private Guid CallerServerId() =>
        Guid.Parse(User.FindFirst(ApiKeyClaimTypes.ServerId)!.Value);

    private static ScanSessionResponse ToResponse(ScanSession s) => new(
        s.Id, s.PlayerIdentifier, s.Status.ToString(), s.RiskScore, s.AiSummary, s.CreatedAt, s.StartedAt, s.CompletedAt);
}
