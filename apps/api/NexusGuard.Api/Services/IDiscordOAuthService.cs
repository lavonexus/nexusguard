namespace NexusGuard.Api.Services;

public record DiscordProfile(string Id, string Username);

public interface IDiscordOAuthService
{
    string BuildAuthorizeUrl(string state);

    Task<DiscordProfile> ExchangeCodeAsync(string code, CancellationToken ct = default);
}
