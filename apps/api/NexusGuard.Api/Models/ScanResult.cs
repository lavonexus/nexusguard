namespace NexusGuard.Api.Models;

// One row per batch of raw findings the scanner uploads (e.g. one "Process" batch,
// one "Hash" batch, etc). Kept intentionally schema-loose (jsonb) in Phase 1 - the
// Detection Engine (Phase 5) is what turns these into structured Detection rows.
public class ScanResult
{
    public Guid Id { get; set; }

    public Guid ScanSessionId { get; set; }
    public ScanSession? ScanSession { get; set; }

    public ScanResultType ResultType { get; set; }

    // Raw JSON payload as submitted by the scanner for this result type.
    public string DataJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
