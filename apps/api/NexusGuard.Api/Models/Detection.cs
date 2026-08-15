namespace NexusGuard.Api.Models;

// One rule match produced server-side by the Detection Engine (Phase 5) from raw
// ScanResult data. Never derived from anything the scanner asserts about itself - that's
// the whole point of this table existing separately from ScanResult.
public class Detection
{
    public Guid Id { get; set; }

    public Guid ScanSessionId { get; set; }
    public ScanSession? ScanSession { get; set; }

    public string RuleId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Weight { get; set; }
    public string Evidence { get; set; } = string.Empty;

    // CHEAT | INJECTOR | LUA | LOADER | MAPPER | SUSPICIOUS DLL | SUSPICIOUS DRIVER | CLEANER |
    // HISTORICAL ARTIFACT | SUSPICIOUS APPLICATION | SUSPICIOUS PROCESS | RPF | OTHER - a plain
    // string rather than an enum so CheatSignatureDatabase entries can introduce new categories
    // without a migration.
    public string Category { get; set; } = "OTHER";

    // ACTIVE (the thing was observed live in this scan) | HISTORICAL (an uninstall/registry
    // record survives but the executable itself wasn't found) | REMOVED (same idea, explicitly
    // an uninstall entry) | UNKNOWN.
    public string Status { get; set; } = "Active";

    // LOW (filename/pattern match only) | MEDIUM (suspicious file + suspicious path) | HIGH
    // (known hash or strong independent signal) | CONFIRMED (multiple independent signals) -
    // never auto-escalated to CONFIRMED by correlation alone, only ever set that high by an
    // exact known-bad hash match.
    public string Confidence { get; set; } = "Medium";

    public string? Sha256 { get; set; }
    public string? Publisher { get; set; }
    public bool? Signed { get; set; }
    public DateTime? FirstSeenUtc { get; set; }
    public DateTime? LastModifiedUtc { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
