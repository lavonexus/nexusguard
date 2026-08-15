using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Database;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public class UserSessionService : IUserSessionService
{
    private readonly NexusGuardDbContext _db;
    private readonly ITokenService _tokens;
    private readonly int _sessionTtlDays;
    private readonly string? _bootstrapAdminEmail;

    public UserSessionService(NexusGuardDbContext db, ITokenService tokens, IConfiguration config)
    {
        _db = db;
        _tokens = tokens;
        _sessionTtlDays = config.GetValue<int?>("UserSessions:TtlDays") ?? 30;
        _bootstrapAdminEmail = config["Admin:BootstrapEmail"];
    }

    public async Task<User> UpsertFromDiscordAsync(DiscordProfile profile, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.DiscordId == profile.Id, ct);
        if (user is not null)
        {
            user.Username = profile.Username;
            user.AvatarUrl = profile.AvatarUrl;
            user.LastLoginProvider = "Discord";
            await _db.SaveChangesAsync(ct);
            return user;
        }

        user = new User
        {
            Id = Guid.NewGuid(),
            DiscordId = profile.Id,
            Username = profile.Username,
            AvatarUrl = profile.AvatarUrl,
            LastLoginProvider = "Discord",
            CreatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<User> UpsertFromGoogleAsync(GoogleProfile profile, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == profile.Id, ct);
        if (user is not null)
        {
            user.Email = profile.Email;
            user.AvatarUrl = profile.Picture;
            user.LastLoginProvider = "Google";
            ApplyAdminBootstrap(user);
            await _db.SaveChangesAsync(ct);
            return user;
        }

        user = new User
        {
            Id = Guid.NewGuid(),
            GoogleId = profile.Id,
            Username = string.IsNullOrWhiteSpace(profile.Name) ? profile.Email : profile.Name,
            Email = profile.Email,
            AvatarUrl = profile.Picture,
            LastLoginProvider = "Google",
            CreatedAt = DateTime.UtcNow,
        };
        ApplyAdminBootstrap(user);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    // The site owner's admin panel access has to come from somewhere before any admin exists
    // to grant it - keying it to one configured email (set via Admin:BootstrapEmail, never
    // committed as a literal) means it's re-applied idempotently on every login rather than a
    // one-time seed that could be lost or accidentally revoked.
    private void ApplyAdminBootstrap(User user)
    {
        if (string.IsNullOrWhiteSpace(_bootstrapAdminEmail)) return;
        if (string.IsNullOrWhiteSpace(user.Email)) return;
        if (!string.Equals(user.Email, _bootstrapAdminEmail, StringComparison.OrdinalIgnoreCase)) return;

        user.IsSiteAdmin = true;
    }

    public async Task<string> CreateSessionAsync(Guid userId, CancellationToken ct = default)
    {
        var token = _tokens.GenerateOpaqueToken();

        _db.UserSessions.Add(new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = _tokens.Hash(token),
            ExpiresAt = DateTime.UtcNow.AddDays(_sessionTtlDays),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(ct);
        return token;
    }

    public async Task RevokeSessionAsync(string token, CancellationToken ct = default)
    {
        var tokenHash = _tokens.Hash(token);
        var session = await _db.UserSessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash, ct);
        if (session is null) return;

        _db.UserSessions.Remove(session);
        await _db.SaveChangesAsync(ct);
    }
}
