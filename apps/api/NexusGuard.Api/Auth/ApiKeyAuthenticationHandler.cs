using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusGuard.Api.Database;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Auth;

public static class ApiKeyClaimTypes
{
    public const string ServerId = "ng_server_id";
}

// Validates the "X-Api-Key" header against a Server's stored key hash. This is the
// scheme used by admin/dashboard requests (creating scans, listing results, etc) - never
// by Scanner.exe, which only ever holds a short-lived scan token (see ScannerTokenAuthenticationHandler).
public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private readonly NexusGuardDbContext _db;
    private readonly ITokenService _tokens;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
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
        if (!Request.Headers.TryGetValue(ApiKeyAuthenticationOptions.HeaderName, out var headerValues))
            return AuthenticateResult.Fail($"Missing {ApiKeyAuthenticationOptions.HeaderName} header.");

        var apiKey = headerValues.ToString();
        if (string.IsNullOrWhiteSpace(apiKey))
            return AuthenticateResult.Fail("Empty API key.");

        var prefix = _tokens.Prefix(apiKey);

        var server = await _db.Servers.FirstOrDefaultAsync(s => s.ApiKeyPrefix == prefix);
        if (server is null || !server.IsActive || !_tokens.Verify(apiKey, server.ApiKeyHash))
            return AuthenticateResult.Fail("Invalid API key.");

        var claims = new[]
        {
            new Claim(ApiKeyClaimTypes.ServerId, server.Id.ToString()),
            new Claim(ClaimTypes.Name, server.Name)
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }
}
