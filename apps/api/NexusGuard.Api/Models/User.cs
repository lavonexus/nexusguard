namespace NexusGuard.Api.Models;

// Phase 1: minimal user record used to own servers.
// Discord OAuth (Phase 6) will populate DiscordId/Username via login instead of the
// bootstrap endpoint used for local development.
public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;

    // Username is overwritten on every OAuth login (it mirrors the provider's own username).
    // DisplayName is a separate, user-editable preference that login never touches - null
    // until they set one, in which case the dashboard falls back to Username.
    public string? DisplayName { get; set; }

    public string? DiscordId { get; set; }
    public string? GoogleId { get; set; }
    public string? Email { get; set; }

    // Refreshed on every login, same as Username - always reflects whichever provider they
    // most recently signed in with, not necessarily the first one they ever linked. Used on
    // the global leaderboard so a Discord login shows their Discord avatar/name and a Google
    // login shows their Google one, per the account that's actually current.
    public string? AvatarUrl { get; set; }
    public string? LastLoginProvider { get; set; } // "Discord" | "Google"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Site-wide admin panel access (Controllers/AdminController.cs) - unrelated to owning or
    // managing any particular Server. Only ever set by another site admin, or bootstrapped for
    // the configured Admin:BootstrapEmail on Google login (see UserSessionService).
    public bool IsSiteAdmin { get; set; } = false;

    public ICollection<Server> Servers { get; set; } = new List<Server>();
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
}
