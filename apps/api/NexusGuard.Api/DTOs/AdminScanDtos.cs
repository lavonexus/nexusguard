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
    int DetectionCount);

public record AdminScanDetailResponse(
    AdminScanSummaryResponse Scan,
    List<ScanResultSummaryResponse> Results,
    List<DetectionResponse> Detections);
