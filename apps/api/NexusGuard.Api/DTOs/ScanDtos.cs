namespace NexusGuard.Api.DTOs;

// --- Admin-facing (authenticated with the server's X-Api-Key) ---

// PlayerIdentifier is optional - the admin often doesn't know who they're scanning yet
// (that's the point of the scan). ScanSessionService.CreateAsync fills in a placeholder
// label when it's left blank.
public record CreateScanRequest(string? PlayerIdentifier = null);

public record CreateScanResponse(Guid ScanId, string Pin, DateTime PinExpiresAt);

public record ScanSessionResponse(
    Guid Id,
    string PlayerIdentifier,
    string Status,
    int? RiskScore,
    string? AiSummary,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt);

public record ScanResultSummaryResponse(Guid Id, string ResultType, string DataJson, DateTime CreatedAt);

public record DetectionResponse(Guid Id, string RuleId, string Description, int Weight, string Evidence, DateTime CreatedAt);

public record ScanSessionDetailResponse(
    ScanSessionResponse Session,
    List<ScanResultSummaryResponse> Results,
    List<DetectionResponse> Detections);

// --- Scanner-facing (authenticated with the short-lived scan token, except the PIN exchange) ---

public record ScannerSessionRequest(Guid ScanId, string Pin);

// Used by the Scanner.exe GUI, which only ever asks the player for a PIN.
public record ScannerSessionByPinRequest(string Pin);

public record ScannerSessionResponse(string ScanToken, DateTime ExpiresAt, ScannerThemeResponse Theme);

// Purely cosmetic - colors, per-stage messages, an optional custom logo, and a watermark
// toggle for what the player sees in Scanner.exe. Never touches scoring or detections.
public record ScannerThemeResponse(
    string PrimaryTextColor, string SecondaryTextColor, string BackgroundColor, string SurfaceColor,
    string TitleBarColor, string AccentColor, string ProgressColor,
    string PinTitle, string PinSubtitle,
    string StageEarlyText, string StageScanningText, string StageDeepText, string StageDetectionText,
    string CompletedTitle, string CompletedSubtitle,
    string? LogoBase64, bool ShowWatermark);

public record UpdateScannerThemeRequest(
    string PrimaryTextColor, string SecondaryTextColor, string BackgroundColor, string SurfaceColor,
    string TitleBarColor, string AccentColor, string ProgressColor,
    string PinTitle, string PinSubtitle,
    string StageEarlyText, string StageScanningText, string StageDeepText, string StageDetectionText,
    string CompletedTitle, string CompletedSubtitle,
    string? LogoBase64, bool ShowWatermark);

public record ScannerHeartbeatRequest(string? StatusNote);

public record ScannerResultRequest(string ResultType, string DataJson);

// Phase 7: the scanner uploads a candidate file's raw bytes for server-side YARA scanning.
// The bytes are written to a temp file, scanned, and deleted immediately - never persisted.
public record SubmitFileRequest(string FileName, string ContentBase64);

public record SubmitFileResponse(int MatchCount, List<string> RuleIds);

// No RiskScore field - Phase 5 computes it server-side via IDetectionEngine instead of
// trusting whatever the scanner claims about itself.
public record ScannerCompleteResponse(int RiskScore, int DetectionCount);
