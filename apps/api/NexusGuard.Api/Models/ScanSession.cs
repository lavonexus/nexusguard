namespace NexusGuard.Api.Models;

// Lifecycle:
//   1. Admin (Server API key) calls POST /api/scans -> Pending, PIN generated (short TTL)
//   2. Scanner.exe calls POST /api/scanner/session with {scanId, pin} -> TokenIssued,
//      receives a short-lived opaque scan token used only for the /api/scanner/* endpoints
//   3. Scanner submits results as it collects them -> InProgress
//   4. Scanner calls POST /api/scanner/complete -> Completed, RiskScore set
//
// Neither the PIN nor the scan token are ever stored in plaintext - only their hashes,
// so a database read alone can't be used to impersonate a scan.
public class ScanSession
{
    public Guid Id { get; set; }

    public Guid ServerId { get; set; }
    public Server? Server { get; set; }

    // Who clicked "New scan" - resolved from the dashboard session cookie when present.
    // Null for scans created with only the raw server API key (no logged-in identity riding
    // along), e.g. a bare curl call - so this is opportunistic attribution, not a guarantee.
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    // Identifier supplied by the admin when requesting the scan (FiveM license, in-game
    // name, Discord id, etc.) - intentionally a free-form string in Phase 1.
    public string PlayerIdentifier { get; set; } = string.Empty;

    public ScanSessionStatus Status { get; set; } = ScanSessionStatus.Pending;

    public string PinHash { get; set; } = string.Empty;
    public DateTime PinExpiresAt { get; set; }

    public string? ScanTokenPrefix { get; set; }
    public string? ScanTokenHash { get; set; }
    public DateTime? ScanTokenExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? LastHeartbeatAt { get; set; }

    // Placeholder scoring for Phase 1 - the real weighted rule engine arrives in Phase 5.
    public int? RiskScore { get; set; }

    // Phase 8: a human-readable risk assessment generated from the Detection rows by
    // Claude - never from raw scanner output. Best-effort; null if generation failed or
    // there was nothing to summarize yet.
    public string? AiSummary { get; set; }

    public ICollection<ScanResult> Results { get; set; } = new List<ScanResult>();
    public ICollection<Detection> Detections { get; set; } = new List<Detection>();
}
