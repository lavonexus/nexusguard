using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Auth;

public static class ScannerTokenClaimTypes
{
    public const string ScanSessionId = "ng_scan_session_id";
}

// Validates the "Authorization: Bearer <scanToken>" header used exclusively by
// Scanner.exe against the /api/scanner/* endpoints. The token is short-lived, single-scan,
// and deliberately cannot do anything an admin API key can (no server management, no
// creating new scans) - see section 11 of the architecture doc ("Scanner'a kalıcı admin
// API key gömmemelisin").
public class ScannerTokenAuthenticationHandler : AuthenticationHandler<ScannerTokenAuthenticationOptions>
{
    private readonly IScanSessionService _scanSessions;

    public ScannerTokenAuthenticationHandler(
        IOptionsMonitor<ScannerTokenAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IScanSessionService scanSessions) : base(options, logger, encoder)
    {
        _scanSessions = scanSessions;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return AuthenticateResult.Fail("Missing Authorization header.");

        var value = authHeader.ToString();
        if (!value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.Fail("Expected 'Bearer <scanToken>'.");

        var token = value["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
            return AuthenticateResult.Fail("Empty scan token.");

        var session = await _scanSessions.GetByScanTokenAsync(token);
        if (session is null)
            return AuthenticateResult.Fail("Invalid or expired scan token.");

        var claims = new[] { new Claim(ScannerTokenClaimTypes.ScanSessionId, session.Id.ToString()) };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        // Stash the resolved session on HttpContext so controllers don't need to re-query it.
        Context.Items["ScanSession"] = session;

        return AuthenticateResult.Success(ticket);
    }
}
