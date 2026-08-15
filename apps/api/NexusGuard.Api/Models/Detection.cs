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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
