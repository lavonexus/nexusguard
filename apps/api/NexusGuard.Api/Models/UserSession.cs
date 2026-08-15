namespace NexusGuard.Api.Models;

// A logged-in dashboard session, created after a successful Discord OAuth callback.
// Same pattern as ScanSession's token: only the hash is stored, the opaque value only
// ever lives in the browser's session cookie.
public class UserSession
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
