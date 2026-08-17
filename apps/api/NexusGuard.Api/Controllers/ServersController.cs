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

[ApiController]
[Route("api/servers")]
public class ServersController : ControllerBase
{
    private const string OwnerSchemes =
        ApiKeyAuthenticationOptions.SchemeName + "," + DashboardSessionAuthenticationOptions.SchemeName;

    private readonly NexusGuardDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IScannerThemeService _themes;

    public ServersController(NexusGuardDbContext db, ITokenService tokens, IScannerThemeService themes)
    {
        _db = db;
        _tokens = tokens;
        _themes = themes;
    }

    // Registering a server works two ways: a logged-in dashboard session (Phase 6) supplies
    // the owner implicitly, or an explicit OwnerUserId in the body for the Phase 1 bootstrap
    // flow (curl walkthrough, no login yet). Whichever is present wins; the session is
    // preferred when both are.
    [HttpPost]
    public async Task<ActionResult<CreateServerResponse>> Create(CreateServerRequest request)
    {
        var ownerId = await ResolveSessionUserIdAsync() ?? request.OwnerUserId;
        if (ownerId is null)
            return BadRequest("Log in via Discord, or supply OwnerUserId directly.");

        var owner = await _db.Users.FindAsync(ownerId.Value);
        if (owner is null) return BadRequest("OwnerUserId does not reference an existing user.");

        var apiKey = _tokens.GenerateApiKey();

        var server = new Server
        {
            Id = Guid.NewGuid(),
            OwnerUserId = owner.Id,
            Name = request.Name,
            ApiKeyPrefix = _tokens.Prefix(apiKey),
            ApiKeyHash = _tokens.Hash(apiKey),
            CreatedAt = DateTime.UtcNow
        };

        _db.Servers.Add(server);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = server.Id },
            new CreateServerResponse(server.Id, server.Name, apiKey));
    }

    // Renames a server and, if it was pending a post-Enterprise-grant setup screen, clears
    // that flag - this is the only action that can clear NeedsSetup, so the dashboard can rely
    // on "they've renamed it" as "they've completed onboarding" without a separate flag flip.
    [HttpPatch("{id:guid}")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<ServerResponse>> Rename(Guid id, RenameServerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");
        if (request.Name.Length > 128)
            return BadRequest("Name must be 128 characters or fewer.");

        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerOwnsServerAsync(server)) return Forbid();

        server.Name = request.Name.Trim();
        server.NeedsSetup = false;
        await _db.SaveChangesAsync();

        return ToServerResponse(server);
    }

    // Kurumsal > Ayarlar (Discord URL, scan-visibility toggle, branding logo URL). Owner-only,
    // same reasoning as SetMemberRole - not delegable to a Manager.
    [HttpPut("{id:guid}/settings")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<ServerResponse>> UpdateSettings(Guid id, UpdateServerSettingsRequest request)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerIsOwnerBySessionAsync(server)) return StatusCode(StatusCodes.Status403Forbidden);

        server.DiscordUrl = string.IsNullOrWhiteSpace(request.DiscordUrl) ? null : request.DiscordUrl.Trim();
        server.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();
        server.ShowAllScansToMembers = request.ShowAllScansToMembers;
        await _db.SaveChangesAsync();

        return ToServerResponse(server);
    }

    // Every server the logged-in Discord/Google user owns OR is a team member of - lets the
    // dashboard show servers whose API key isn't sitting in this browser's local storage
    // (a different machine, one created before this login existed, or one someone else owns
    // but added them to).
    [HttpGet("mine")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<List<MyServerResponse>>> Mine()
    {
        var userId = Guid.Parse(User.FindFirst(DashboardSessionClaimTypes.UserId)!.Value);

        var owned = await _db.Servers
            .Where(s => s.OwnerUserId == userId)
            .ToListAsync();

        var memberServerIds = await _db.ServerMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.ServerId)
            .ToListAsync();
        var memberOf = memberServerIds.Count == 0
            ? []
            : await _db.Servers.Where(s => memberServerIds.Contains(s.Id)).ToListAsync();

        var result = owned.Select(s => ToMyServerResponse(s, "Owner"))
            .Concat(memberOf.Select(s => ToMyServerResponse(s, "Member")))
            .OrderByDescending(s => s.CreatedAt)
            .ToList();

        return result;
    }

    [HttpGet("{id:guid}")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<ServerResponse>> Get(Guid id)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        return ToServerResponse(server);
    }

    // Kurumsal > Genel Bakış. Aggregates are always workspace-wide (visible to every member
    // regardless of the scan-visibility toggle - a total count isn't the same privacy concern
    // as a list of individual scans), but RecentActivity is a list of individual scans, so it
    // respects the same per-member restriction as GET /api/scans.
    [HttpGet("{id:guid}/overview")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<ServerOverviewResponse>> Overview(Guid id)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        var memberCount = 1 + await _db.ServerMembers.CountAsync(m => m.ServerId == id); // +1 for the owner

        var totalScans = await _db.ScanSessions.CountAsync(s => s.ServerId == id);
        var completed = _db.ScanSessions.Where(s => s.ServerId == id && s.Status == ScanSessionStatus.Completed);
        var hileCount = await completed.CountAsync(s => s.RiskScore >= 60);
        var uyariCount = await completed.CountAsync(s => s.RiskScore >= 25 && s.RiskScore < 60);
        var temizCount = await completed.CountAsync(s => s.RiskScore < 25);
        var calisiyorCount = totalScans - hileCount - uyariCount - temizCount;

        var detectionRate = totalScans > 0 ? hileCount * 100.0 / totalScans : 0.0;

        var since = DateTime.UtcNow.Date.AddDays(-29);
        var dailyRows = await _db.ScanSessions
            .Where(s => s.ServerId == id && s.CreatedAt >= since)
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();
        var dailyLookup = dailyRows.ToDictionary(r => DateOnly.FromDateTime(r.Date), r => r.Count);
        var activitySeries = Enumerable.Range(0, 30)
            .Select(i => DateOnly.FromDateTime(since.AddDays(i)))
            .Select(d => new DailyScanCount(d, dailyLookup.GetValueOrDefault(d)))
            .ToList();

        var restrictToCallerId = await ResolveScanVisibilityRestrictionAsync(server);
        var recentQuery = _db.ScanSessions.Include(s => s.CreatedByUser).Where(s => s.ServerId == id);
        if (restrictToCallerId.HasValue)
            recentQuery = recentQuery.Where(s => s.CreatedByUserId == restrictToCallerId.Value);
        var recent = await recentQuery.OrderByDescending(s => s.CreatedAt).Take(10).ToListAsync();
        var recentActivity = recent.Select(s => new RecentScanSummary(
            s.Id, s.PlayerIdentifier, DecisionOf(s.Status, s.RiskScore), s.CreatedByUser?.Username, s.CreatedAt)).ToList();

        var decisionBuckets = new List<DecisionBucketCount>
        {
            new("Temiz", temizCount),
            new("Uyarı", uyariCount),
            new("Hile", hileCount),
            new("Çalışıyor", calisiyorCount),
        };

        return new ServerOverviewResponse(
            memberCount, server.EnterpriseSeats, totalScans, hileCount, detectionRate,
            activitySeries, decisionBuckets, recentActivity);
    }

    // Mirrors lib/riskBuckets.ts's decisionOf exactly - the dashboard's donut/leaderboard/scan
    // table and this endpoint must always agree on what counts as a detection.
    private static string DecisionOf(ScanSessionStatus status, int? riskScore)
    {
        if (status != ScanSessionStatus.Completed) return "Çalışıyor";
        if (riskScore >= 60) return "Hile";
        if (riskScore >= 25) return "Uyarı";
        return "Temiz";
    }

    // Same rule as ScansController.List's visibility restriction (a plain Member only sees
    // scans they created, unless the owner has widened this) - duplicated rather than shared
    // since it's ~10 lines and each controller already resolves its own caller/server context
    // differently (this one already has `server` loaded; ScansController resolves it from the
    // API-key claim instead).
    private async Task<Guid?> ResolveScanVisibilityRestrictionAsync(Server server)
    {
        var callerId = await ResolveSessionUserIdAsync();
        if (!callerId.HasValue) return null;
        if (server.EffectivePlan != "Enterprise" || server.ShowAllScansToMembers) return null;
        if (callerId.Value == server.OwnerUserId) return null;

        var member = await _db.ServerMembers.FirstOrDefaultAsync(m => m.ServerId == server.Id && m.UserId == callerId.Value);
        if (member is null || member.Role == "Manager") return null;

        return callerId;
    }

    // Enterprise-only: teammates beyond the owner. Added by their NexusGuard Discord username,
    // so they must have signed in at least once already (that's how Users rows get created).
    [HttpGet("{id:guid}/members")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<List<ServerMemberResponse>>> ListMembers(Guid id)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        var owner = await _db.Users.FindAsync(server.OwnerUserId);
        var members = await _db.ServerMembers
            .Include(m => m.User)
            .Where(m => m.ServerId == id)
            .OrderBy(m => m.AddedAt)
            .ToListAsync();

        var scanStats = await ScanStatsByUserAsync(id);

        var result = new List<ServerMemberResponse>();
        if (owner is not null)
        {
            var (ownerCount, ownerLastActive) = scanStats.TryGetValue(owner.Id, out var os) ? os : (0, (DateTime?)null);
            result.Add(new ServerMemberResponse(owner.Id, owner.Id, owner.Username, "Owner", server.CreatedAt, ownerCount, ownerLastActive));
        }
        result.AddRange(members.Select(m =>
        {
            var (count, lastActive) = scanStats.TryGetValue(m.UserId, out var s) ? s : (0, (DateTime?)null);
            return new ServerMemberResponse(m.Id, m.UserId, m.User?.Username ?? "(unknown)", m.Role, m.AddedAt, count, lastActive);
        }));

        return result;
    }

    // Scan count + most recent scan timestamp per creator, scoped to this server - shared by
    // ListMembers (per-row stats) and Overview (workspace-wide aggregates). Only ever counts
    // scans where CreatedByUserId resolved (see ScanSessionService/DiscordBotController) -
    // scans with no resolvable creator simply don't count toward anyone's personal total.
    private async Task<Dictionary<Guid, (int Count, DateTime? LastActive)>> ScanStatsByUserAsync(Guid serverId)
    {
        var rows = await _db.ScanSessions
            .Where(s => s.ServerId == serverId && s.CreatedByUserId != null)
            .GroupBy(s => s.CreatedByUserId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count(), LastActive = g.Max(s => s.CreatedAt) })
            .ToListAsync();

        return rows.ToDictionary(r => r.UserId, r => (r.Count, (DateTime?)r.LastActive));
    }

    [HttpPost("{id:guid}/members")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<ServerMemberResponse>> AddMember(Guid id, AddMemberRequest request)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanManageMembersAsync(server)) return StatusCode(StatusCodes.Status403Forbidden);

        if (server.EffectivePlan != "Enterprise")
            return BadRequest("Team members require an active Enterprise plan.");

        var identifier = request.Identifier?.Trim();
        if (string.IsNullOrWhiteSpace(identifier))
            return BadRequest("A Discord username, Discord ID, or Google email is required.");

        // An "@" means the email they registered with (only ever populated by Google login,
        // see User.cs); all-digits means a Discord ID (snowflakes are numeric-only, unlike any
        // real Discord username); anything else is a Discord username - same single field
        // either way, no separate "how did they sign in" toggle for the owner to pick.
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

        // Seats include the owner - a 5-seat grant means 1 owner + 4 members.
        var seats = server.EnterpriseSeats ?? 0;
        var currentMemberCount = await _db.ServerMembers.CountAsync(m => m.ServerId == id);
        if (currentMemberCount + 1 >= seats)
            return BadRequest($"This server's Enterprise plan is limited to {seats} people (including the owner) - remove someone first or ask a site admin to upgrade the seat count.");

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

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid memberId)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanManageMembersAsync(server)) return StatusCode(StatusCodes.Status403Forbidden);

        var member = await _db.ServerMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ServerId == id);
        if (member is null) return NotFound();

        _db.ServerMembers.Remove(member);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Owner-only, not delegable to a Manager - handing out the ability to add/remove people is
    // a bigger grant than add/remove itself, so it stays with whoever actually owns the server.
    [HttpPut("{id:guid}/members/{memberId:guid}/role")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<ServerMemberResponse>> SetMemberRole(Guid id, Guid memberId, SetMemberRoleRequest request)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerIsOwnerBySessionAsync(server)) return StatusCode(StatusCodes.Status403Forbidden);

        if (request.Role != "Manager" && request.Role != "Member")
            return BadRequest("Role must be \"Manager\" or \"Member\".");

        var member = await _db.ServerMembers.Include(m => m.User).FirstOrDefaultAsync(m => m.Id == memberId && m.ServerId == id);
        if (member is null) return NotFound();

        member.Role = request.Role;
        await _db.SaveChangesAsync();

        var scanStats = await ScanStatsByUserAsync(id);
        var (count, lastActive) = scanStats.TryGetValue(member.UserId, out var s) ? s : (0, (DateTime?)null);

        return new ServerMemberResponse(member.Id, member.UserId, member.User?.Username ?? "(unknown)", member.Role, member.AddedAt, count, lastActive);
    }

    // Scanner.exe theming - colors/labels/logo/watermark the player sees while a scan runs.
    // Purely cosmetic; never touches the Detection Engine or risk scoring.
    [HttpGet("{id:guid}/theme")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<ScannerThemeResponse>> GetTheme(Guid id)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        return await _themes.GetAsync(id);
    }

    [HttpPut("{id:guid}/theme")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<ScannerThemeResponse>> UpdateTheme(Guid id, UpdateScannerThemeRequest request)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        // Tool Designer stays fully browsable/editable on Free so people can see what they'd
        // get - only the actual save (and therefore anything reaching the real Scanner.exe
        // players run) requires a paid plan.
        if (server.EffectivePlan == "Free")
            return StatusCode(StatusCodes.Status402PaymentRequired,
                "Tool Designer değişikliklerini kaydetmek için Free planın yeterli değil - PRO ya da üstü bir plana geçmen gerekiyor.");

        try
        {
            return await _themes.UpdateAsync(id, request);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // Rotates the API key for the target server. The old key stops working immediately -
    // anyone else (owner, other members) currently using it will need this new one, so
    // rotating is disruptive in a team, not just a recovery action.
    // Reachable by the server's own current key, the owner's login, or a team member's login.
    [HttpPost("{id:guid}/apikey")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<RotateApiKeyResponse>> RotateApiKey(Guid id)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        var apiKey = _tokens.GenerateApiKey();
        server.ApiKeyPrefix = _tokens.Prefix(apiKey);
        server.ApiKeyHash = _tokens.Hash(apiKey);

        await _db.SaveChangesAsync();

        return new RotateApiKeyResponse(apiKey);
    }

    private static ServerResponse ToServerResponse(Server server) => new(
        server.Id, server.Name, server.CreatedAt, server.IsActive,
        server.EffectivePlan, server.EnterpriseSeats, server.PlanExpiresAt, server.NeedsSetup,
        server.DiscordUrl, server.ShowAllScansToMembers, server.LogoUrl);

    private static MyServerResponse ToMyServerResponse(Server server, string role) => new(
        server.Id, server.Name, server.CreatedAt, server.IsActive,
        server.EffectivePlan, server.EnterpriseSeats, server.PlanExpiresAt, server.NeedsSetup, role);

    private async Task<Guid?> ResolveSessionUserIdAsync()
    {
        var result = await HttpContext.AuthenticateAsync(DashboardSessionAuthenticationOptions.SchemeName);
        var claim = result.Principal?.FindFirst(DashboardSessionClaimTypes.UserId)?.Value;
        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    private Task<bool> CallerOwnsServerAsync(Server server)
    {
        var apiKeyClaim = User.FindFirst(ApiKeyClaimTypes.ServerId)?.Value;
        if (Guid.TryParse(apiKeyClaim, out var callerServerId) && callerServerId == server.Id)
            return Task.FromResult(true);

        var sessionClaim = User.FindFirst(DashboardSessionClaimTypes.UserId)?.Value;
        if (Guid.TryParse(sessionClaim, out var callerUserId) && callerUserId == server.OwnerUserId)
            return Task.FromResult(true);

        return Task.FromResult(false);
    }

    // Owner-or-current-key access, extended to team members - for the endpoints that are
    // safe to delegate (reading, rotating the shared key) as opposed to owner-only actions
    // like billing/plan changes and adding/removing teammates.
    private async Task<bool> CallerCanAccessServerAsync(Server server)
    {
        if (await CallerOwnsServerAsync(server)) return true;

        var sessionClaim = User.FindFirst(DashboardSessionClaimTypes.UserId)?.Value;
        if (!Guid.TryParse(sessionClaim, out var callerUserId)) return false;

        return await _db.ServerMembers.AnyAsync(m => m.ServerId == server.Id && m.UserId == callerUserId);
    }

    // Strictly the account that owns the server, resolved from the dashboard session only - no
    // API-key fallback. The API key is the single credential shared with every team member once
    // they join (see PendingMembershipBanner on the frontend), so holding it no longer proves
    // someone is the owner - only a resolved session identifies a specific individual caller.
    private async Task<bool> CallerIsOwnerBySessionAsync(Server server)
    {
        var userId = await ResolveSessionUserIdAsync();
        return userId.HasValue && userId.Value == server.OwnerUserId;
    }

    // Owner, or a member the owner has promoted to Manager - who's allowed to add/remove
    // teammates day to day without being the account owner. Session-only for the same reason
    // as CallerIsOwnerBySessionAsync above.
    private async Task<bool> CallerCanManageMembersAsync(Server server)
    {
        var userId = await ResolveSessionUserIdAsync();
        if (!userId.HasValue) return false;
        if (userId.Value == server.OwnerUserId) return true;

        return await _db.ServerMembers.AnyAsync(m => m.ServerId == server.Id && m.UserId == userId.Value && m.Role == "Manager");
    }
}
