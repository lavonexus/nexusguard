using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Controllers;

// Bot-facing endpoints (apps/bot/NexusGuard.Bot) - authenticated by a single shared secret
// (X-Bot-Secret, configured as Discord:BotSharedSecret) instead of a full auth scheme, since
// the bot has no per-request identity of its own beyond "is the real bot". The bot never holds
// or persists a per-server API key past the one /link call that validates it - DiscordGuildLink
// is the only durable state, living in Postgres instead of the bot's own (ephemeral, on
// Render) filesystem.
[ApiController]
[Route("api/discord")]
public class DiscordBotController : ControllerBase
{
    private readonly NexusGuardDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IScanSessionService _scanSessions;
    private readonly string? _botSecret;

    public DiscordBotController(
        NexusGuardDbContext db, ITokenService tokens, IScanSessionService scanSessions, IConfiguration config)
    {
        _db = db;
        _tokens = tokens;
        _scanSessions = scanSessions;
        _botSecret = config["Discord:BotSharedSecret"];
    }

    [HttpPost("link")]
    public async Task<IActionResult> Link(LinkGuildRequest request)
    {
        if (!IsAuthorizedBot()) return StatusCode(StatusCodes.Status403Forbidden);

        var prefix = _tokens.Prefix(request.ApiKey);
        var server = await _db.Servers.FirstOrDefaultAsync(s => s.ApiKeyPrefix == prefix);
        if (server is null || !server.IsActive || !_tokens.Verify(request.ApiKey, server.ApiKeyHash))
            return BadRequest("That API key doesn't look valid.");

        var link = await _db.DiscordGuildLinks.FindAsync(request.GuildId);
        if (link is null)
        {
            link = new DiscordGuildLink { GuildId = request.GuildId };
            _db.DiscordGuildLinks.Add(link);
        }
        link.ServerId = server.Id;
        link.LinkedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("scans")]
    public async Task<ActionResult<CreateScanResponse>> CreateScan(CreateBotScanRequest request)
    {
        if (!IsAuthorizedBot()) return StatusCode(StatusCodes.Status403Forbidden);

        var link = await _db.DiscordGuildLinks.FindAsync(request.GuildId);
        if (link is null)
            return BadRequest("This Discord server isn't linked yet - run /nexusguard-link first.");

        var server = await _db.Servers.FindAsync(link.ServerId);
        if (server is null || !server.IsActive) return BadRequest("The linked NexusGuard server is no longer active.");

        // Opportunistic, like the dashboard's own "New scan" attribution - only resolves if the
        // admin who ran the slash command has signed into NexusGuard with that Discord account
        // at least once. Never blocks scan creation if it doesn't resolve.
        Guid? createdByUserId = null;
        if (!string.IsNullOrWhiteSpace(request.InvokerDiscordUserId))
        {
            var invoker = await _db.Users.FirstOrDefaultAsync(u => u.DiscordId == request.InvokerDiscordUserId);
            createdByUserId = invoker?.Id;
        }

        var (session, pin) = await _scanSessions.CreateAsync(
            server.Id, request.PlayerIdentifier, createdByUserId,
            discordUserId: request.DiscordUserId, discordUsername: request.DiscordUsername,
            discordAvatarUrl: request.DiscordAvatarUrl);

        return new CreateScanResponse(session.Id, pin, session.PinExpiresAt);
    }

    private bool IsAuthorizedBot()
    {
        Request.Headers.TryGetValue("X-Bot-Secret", out var provided);
        return BotSecretAuth.Matches(provided.ToString(), _botSecret);
    }
}
