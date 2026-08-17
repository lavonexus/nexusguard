namespace NexusGuard.Api.DTOs;

// The site admin's cross-server view of scans - unlike ScansController (scoped to whichever
// server the caller's API key belongs to), this can see and act on every scan on the platform.
public record AdminScanSummaryResponse(
    Guid Id,
    string PlayerIdentifier,
    string Status,
    int? RiskScore,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    Guid ServerId,
    string ServerName,
    string? CreatedByUsername,
    int DetectionCount,
    // Same fields ScanSessionResponse exposes to the server itself - added so the admin scan
    // detail page can reuse the exact same rich view (AI summary, accounts card) instead of a
    // stripped-down one just because it's missing data that was always on the entity.
    string? AiSummary,
    DateTime? StartedAt,
    string? DiscordUserId,
    string? DiscordUsername,
    string? DiscordAvatarUrl,
    string? SteamId64,
    string? SteamUsername,
    string? SteamAvatarUrl);

public record AdminScanDetailResponse(
    AdminScanSummaryResponse Scan,
    List<ScanResultSummaryResponse> Results,
    List<DetectionResponse> Detections);
