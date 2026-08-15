namespace NexusGuard.Api.Services;

public record GoogleProfile(string Id, string Email, string Name);

public interface IGoogleOAuthService
{
    string BuildAuthorizeUrl(string state);

    Task<GoogleProfile> ExchangeCodeAsync(string code, CancellationToken ct = default);
}
