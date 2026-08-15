using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public interface IAiSummaryService
{
    /// Turns the server's own Detection rows (never raw scanner output) into a short,
    /// human-readable risk assessment for an admin deciding whether to act on a scan.
    /// Best-effort - returns null on any failure rather than blocking scan completion.
    Task<string?> SummarizeAsync(
        string playerIdentifier, int riskScore, List<Detection> detections, CancellationToken ct = default);
}
