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

        var result = new List<ServerMemberResponse>();
        if (owner is not null)
            result.Add(new ServerMemberResponse(owner.Id, owner.Id, owner.Username, "Owner", server.CreatedAt));
        result.AddRange(members.Select(m =>
            new ServerMemberResponse(m.Id, m.UserId, m.User?.Username ?? "(unknown)", m.Role, m.AddedAt)));

        return result;
    }

    [HttpPost("{id:guid}/members")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<ActionResult<ServerMemberResponse>> AddMember(Guid id, AddMemberRequest request)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerOwnsServerAsync(server)) return Forbid();

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

        return new ServerMemberResponse(member.Id, user.Id, user.Username, member.Role, member.AddedAt);
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    [Authorize(AuthenticationSchemes = OwnerSchemes)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid memberId)
    {
        var server = await _db.Servers.FindAsync(id);
        if (server is null) return NotFound();
        if (!await CallerOwnsServerAsync(server)) return Forbid();

        var member = await _db.ServerMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ServerId == id);
        if (member is null) return NotFound();

        _db.ServerMembers.Remove(member);
        await _db.SaveChangesAsync();

        return NoContent();
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
        server.EffectivePlan, server.EnterpriseSeats, server.PlanExpiresAt, server.NeedsSetup);

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
}
