namespace NexusGuard.Api.Services;

public record DiscordProfile(string Id, string Username, string? AvatarUrl);

public interface IDiscordOAuthService
{
    string BuildAuthorizeUrl(string state);

    Task<DiscordProfile> ExchangeCodeAsync(string code, CancellationToken ct = default);
}
