using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public interface IUserSessionService
{
    /// Finds the User for a given Discord id, creating one if this is their first login.
    Task<User> UpsertFromDiscordAsync(DiscordProfile profile, CancellationToken ct = default);

    /// Same as above for Google - a separate method because the two providers hand back
    /// different identity shapes (Discord: id + username, Google: id + email + display name).
    Task<User> UpsertFromGoogleAsync(GoogleProfile profile, CancellationToken ct = default);

    /// Issues a new opaque session token for a user - only its hash is persisted.
    Task<string> CreateSessionAsync(Guid userId, CancellationToken ct = default);

    /// Resolves and deletes the session behind a given token, if any (logout).
    Task RevokeSessionAsync(string token, CancellationToken ct = default);
}
