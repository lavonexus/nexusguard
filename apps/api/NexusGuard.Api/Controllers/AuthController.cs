using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Controllers;

// Discord OAuth login for the dashboard. This is the only place a browser session gets
// created - Scanner.exe and server-to-server calls never touch this controller, they stay
// on the ApiKey/ScannerToken schemes exactly as before.
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string StateCookieName = "ng_oauth_state";

    private readonly IDiscordOAuthService _discord;
    private readonly IGoogleOAuthService _google;
    private readonly IUserSessionService _sessions;
    private readonly NexusGuardDbContext _db;
    private readonly string _dashboardBaseUrl;

    public AuthController(
        IDiscordOAuthService discord, IGoogleOAuthService google, IUserSessionService sessions,
        NexusGuardDbContext db, IConfiguration config)
    {
        _discord = discord;
        _google = google;
        _sessions = sessions;
        _db = db;
        _dashboardBaseUrl = config["Dashboard:BaseUrl"] ?? "http://localhost:3000";
    }

    [HttpGet("discord/login")]
    public IActionResult Login()
    {
        var state = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));

        Response.Cookies.Append(StateCookieName, state, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10),
        });

        return Redirect(_discord.BuildAuthorizeUrl(state));
    }

    [HttpGet("discord/callback")]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? state)
    {
        var expectedState = Request.Cookies[StateCookieName];
        Response.Cookies.Delete(StateCookieName);

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) ||
            string.IsNullOrEmpty(expectedState) || state != expectedState)
        {
            return Redirect($"{_dashboardBaseUrl}/setup?error=oauth_state_mismatch");
        }

        DiscordProfile profile;
        try
        {
            profile = await _discord.ExchangeCodeAsync(code);
        }
        catch (Exception)
        {
            return Redirect($"{_dashboardBaseUrl}/setup?error=oauth_exchange_failed");
        }

        var user = await _sessions.UpsertFromDiscordAsync(profile);
        var token = await _sessions.CreateSessionAsync(user.Id);

        Response.Cookies.Append(DashboardSessionAuthenticationOptions.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(30),
        });

        return Redirect($"{_dashboardBaseUrl}/setup");
    }

    [HttpGet("google/login")]
    public IActionResult GoogleLogin()
    {
        var state = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));

        Response.Cookies.Append(StateCookieName, state, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10),
        });

        return Redirect(_google.BuildAuthorizeUrl(state));
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? state)
    {
        var expectedState = Request.Cookies[StateCookieName];
        Response.Cookies.Delete(StateCookieName);

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) ||
            string.IsNullOrEmpty(expectedState) || state != expectedState)
        {
            return Redirect($"{_dashboardBaseUrl}/setup?error=oauth_state_mismatch");
        }

        GoogleProfile profile;
        try
        {
            profile = await _google.ExchangeCodeAsync(code);
        }
        catch (Exception)
        {
            return Redirect($"{_dashboardBaseUrl}/setup?error=oauth_exchange_failed");
        }

        var user = await _sessions.UpsertFromGoogleAsync(profile);
        var token = await _sessions.CreateSessionAsync(user.Id);

        Response.Cookies.Append(DashboardSessionAuthenticationOptions.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(30),
        });

        return Redirect($"{_dashboardBaseUrl}/setup");
    }

    [HttpGet("me")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var userId = Guid.Parse(User.FindFirst(DashboardSessionClaimTypes.UserId)!.Value);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        return await ToResponseAsync(user);
    }

    // Username itself is provider-owned (overwritten on every login) - DisplayName is the
    // only profile field the user actually controls here, since we have no local password
    // account to attach more settings to.
    [HttpPatch("me")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<UserResponse>> UpdateMe(UpdateDisplayNameRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest("DisplayName is required.");
        if (request.DisplayName.Length > 64)
            return BadRequest("DisplayName must be 64 characters or fewer.");

        var userId = Guid.Parse(User.FindFirst(DashboardSessionClaimTypes.UserId)!.Value);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.DisplayName = request.DisplayName.Trim();
        await _db.SaveChangesAsync();

        return await ToResponseAsync(user);
    }

    private async Task<UserResponse> ToResponseAsync(User user)
    {
        var activeSessionCount = await _db.UserSessions
            .CountAsync(s => s.UserId == user.Id && s.ExpiresAt > DateTime.UtcNow);

        return new UserResponse(
            user.Id, user.Username, user.DisplayName, user.Email, user.CreatedAt,
            user.DiscordId != null, user.GoogleId != null, activeSessionCount, user.IsSiteAdmin);
    }

    [HttpPost("logout")]
    [Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(DashboardSessionAuthenticationOptions.CookieName, out var token))
        {
            await _sessions.RevokeSessionAsync(token);
        }

        Response.Cookies.Delete(DashboardSessionAuthenticationOptions.CookieName);
        return NoContent();
    }
}
