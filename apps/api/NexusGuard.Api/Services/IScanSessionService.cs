using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public interface IScanSessionService
{
    /// playerIdentifier is optional - a short placeholder ("Tarama-XXXX") is used when blank,
    /// since the admin often doesn't know who they're scanning until the scan runs.
    /// createdByUserId is opportunistic (resolved from a dashboard session cookie if one rode
    /// along with the request) - used only for the "who scans the most" leaderboard.
    Task<(ScanSession Session, string Pin)> CreateAsync(
        Guid serverId, string? playerIdentifier, Guid? createdByUserId, CancellationToken ct = default);

    /// Exchanges a valid, unexpired PIN for a short-lived scan token. Returns null if the
    /// scanId/PIN pair is invalid, already used, or expired.
    Task<(ScanSession Session, string ScanToken)?> ExchangePinAsync(Guid scanId, string pin, CancellationToken ct = default);

    /// Same exchange, but resolves the ScanSession from the PIN alone - the Scanner.exe GUI
    /// only asks the player for a PIN, never a scan ID. Scoped to Pending, unexpired sessions
    /// only, so the search space is always small and short-lived.
    Task<(ScanSession Session, string ScanToken)?> ExchangePinOnlyAsync(string pin, CancellationToken ct = default);

    /// Resolves the ScanSession for a given bearer scan token, or null if invalid/expired.
    Task<ScanSession?> GetByScanTokenAsync(string scanToken, CancellationToken ct = default);

    Task RecordHeartbeatAsync(ScanSession session, CancellationToken ct = default);

    Task AddResultAsync(ScanSession session, ScanResultType type, string dataJson, CancellationToken ct = default);

    /// Same TokenIssued -> InProgress transition AddResultAsync/RecordHeartbeatAsync apply,
    /// exposed standalone for callers (the YARA upload endpoint) that don't go through either.
    Task MarkInProgressAsync(ScanSession session, CancellationToken ct = default);

    Task CompleteAsync(ScanSession session, int riskScore, string? aiSummary, CancellationToken ct = default);
}
