namespace NexusGuard.Api.Models;

// A FiveM server that has been authorized to request scans. Admin/dashboard requests
// authenticate as a Server via the "X-Api-Key" header (see Auth/ApiKeyAuthenticationHandler).
// The raw API key is only ever returned once, at creation/rotation time - only its hash
// and a short lookup prefix are persisted.
public class Server
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public User? Owner { get; set; }

    public string Name { get; set; } = string.Empty;

    public string ApiKeyPrefix { get; set; } = string.Empty; // first 12 chars, used for fast lookup
    public string ApiKeyHash { get; set; } = string.Empty;   // sha256 of the full key

    // Free | Pro | ProDuo | Enterprise. Only Enterprise unlocks ServerMembers (team seats
    // beyond the owner) - see ServersController.AddMember. There's no self-serve checkout -
    // purchases happen over a Discord ticket, and only a site admin (AdminController) can
    // actually change this, after the payment is confirmed.
    public string Plan { get; set; } = "Free";

    // Total headcount (owner + members) for an Enterprise-tier grant - 5, 10, or 15. Null for
    // every other plan.
    public int? EnterpriseSeats { get; set; }

    // Null means the plan never expires (Free, or a site admin's indefinite grant). Once this
    // passes, the server is treated as Free everywhere (see EffectivePlan) without anything
    // needing to actively downgrade it - no cron job to keep correct.
    public DateTime? PlanExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // True right after a site admin grants this server Enterprise for the first time - the
    // owner gets a one-time "name your server" screen before reaching the dashboard, instead
    // of the auto-generated placeholder name a Free signup gets silently. Cleared the moment
    // they rename (or otherwise confirm) via PATCH /api/servers/{id}.
    public bool NeedsSetup { get; set; } = false;

    // Not mapped (no setter) - EF Core skips read-only properties by convention. Every plan
    // check in the codebase should read this, never Plan directly, so an expired grant can't
    // be missed anywhere.
    public string EffectivePlan =>
        PlanExpiresAt.HasValue && PlanExpiresAt.Value < DateTime.UtcNow ? "Free" : Plan;

    public ICollection<ScanSession> ScanSessions { get; set; } = new List<ScanSession>();
    public ICollection<ServerMember> Members { get; set; } = new List<ServerMember>();
    public ServerTheme? Theme { get; set; }
}
