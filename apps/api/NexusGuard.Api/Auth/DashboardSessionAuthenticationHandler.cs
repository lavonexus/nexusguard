using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusGuard.Api.Database;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Auth;

public static class DashboardSessionClaimTypes
{
    public const string UserId = "ng_user_id";
}

// Validates the "ng_session" cookie set after a successful Discord OAuth callback. This is
// the scheme the dashboard uses to act as a logged-in admin (list/create servers, recover
// access to one it owns) - it never grants access to scan/scanner endpoints, those stay on
// the Server API key exclusively.
public class DashboardSessionAuthenticationHandler : AuthenticationHandler<DashboardSessionAuthenticationOptions>
{
    private readonly NexusGuardDbContext _db;
    private readonly ITokenService _tokens;

    public DashboardSessionAuthenticationHandler(
        IOptionsMonitor<DashboardSessionAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        NexusGuardDbContext db,
        ITokenService tokens) : base(options, logger, encoder)
    {
        _db = db;
        _tokens = tokens;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(DashboardSessionAuthenticationOptions.CookieName, out var token) ||
            string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.Fail("Missing session cookie.");
        }

        var tokenHash = _tokens.Hash(token);

        var session = await _db.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash);

        if (session is null || session.User is null)
            return AuthenticateResult.Fail("Invalid session.");

        if (session.ExpiresAt < DateTime.UtcNow)
            return AuthenticateResult.Fail("Session expired.");

        var claims = new[]
        {
            new Claim(DashboardSessionClaimTypes.UserId, session.UserId.ToString()),
            new Claim(ClaimTypes.Name, session.User.Username)
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }
}
