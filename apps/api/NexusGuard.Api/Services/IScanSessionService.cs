using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public interface IScanSessionService
{
    /// playerIdentifier is optional - a short placeholder ("Tarama-XXXX") is used when blank,
    /// since the admin often doesn't know who they're scanning until the scan runs.
    /// createdByUserId is opportunistic (resolved from a dashboard session cookie if one rode
    /// along with the request) - used only for the "who scans the most" leaderboard.
    /// discordUserId/Username/AvatarUrl are set only by the Discord bot's own scan-creation
    /// path (Controllers/DiscordBotController.cs) - the admin picked this member through
    /// Discord's own UI, so this is never read from the scanned player's machine.
    Task<(ScanSession Session, string Pin)> CreateAsync(
        Guid serverId, string? playerIdentifier, Guid? createdByUserId, CancellationToken ct = default,
        string? discordUserId = null, string? discordUsername = null, string? discordAvatarUrl = null);

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

    /// Finds the most recent raw result of a given type for this session, or null if the
    /// scanner never reported one. Used by ScannerController.Complete() to look up the Steam
    /// fact (if any) for identity enrichment - a plain read, not a detection concern, so it
    /// doesn't belong on IDetectionEngine.
    Task<ScanResult?> GetLatestResultAsync(Guid sessionId, ScanResultType type, CancellationToken ct = default);
}
