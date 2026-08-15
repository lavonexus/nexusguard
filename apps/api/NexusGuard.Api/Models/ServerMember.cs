namespace NexusGuard.Api.Models;

// A teammate given access to a Server beyond its owner - an Enterprise-plan feature. The
// owner itself is never a row here; it's tracked by Server.OwnerUserId as before.
public class ServerMember
{
    public Guid Id { get; set; }

    public Guid ServerId { get; set; }
    public Server? Server { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Role { get; set; } = "Member";
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
