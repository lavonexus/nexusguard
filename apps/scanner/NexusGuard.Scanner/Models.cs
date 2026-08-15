namespace NexusGuard.Scanner;

// Mirrors NexusGuard.Api.DTOs.ScannerSessionRequest/Response - kept as plain records here
// since the scanner doesn't reference the API project directly.
public record SessionRequest(Guid ScanId, string Pin);
public record SessionByPinRequest(string Pin);
public record SessionResponse(string ScanToken, DateTime ExpiresAt, ScannerTheme Theme);

// Mirrors NexusGuard.Api.DTOs.ScannerThemeResponse - purely cosmetic, applied live to this
// window's brushes/labels/logo/watermark. Never affects scoring or detections.
public record ScannerTheme(
    string PrimaryTextColor, string SecondaryTextColor, string BackgroundColor, string SurfaceColor,
    string TitleBarColor, string AccentColor, string ProgressColor,
    string PinTitle, string PinSubtitle,
    string StageEarlyText, string StageScanningText, string StageDeepText, string StageDetectionText,
    string CompletedTitle, string CompletedSubtitle,
    string? LogoBase64, bool ShowWatermark);
public record ResultRequest(string ResultType, string DataJson);
public record SubmitFileRequest(string FileName, string ContentBase64);
public record SubmitFileResponse(int MatchCount, List<string> RuleIds);
public record CompleteResponse(int RiskScore, int DetectionCount);

// Raw facts only, deliberately with no "is this bad" opinion attached - the server's
// Detection Engine (Phase 5) is what decides that, from data the scanner can't curate.
// Deliberately NOT included: any "known-cheat-loader" filename list here. dinput8.dll,
// dsound.dll, ScriptHook*.dll etc. are legitimate ASI-loader components almost every FiveM/
// GTA V install has - reporting them as plain facts (path, hash, signature, publisher) and
// letting the server's Detection Engine decide is the whole point of this architecture.
public record ProcessFact(
    string Name, int Pid, string? Path, string? Sha256,
    bool Signed, string? Publisher, string? ParentProcessName);
public record ModuleFact(string Name, string Path, bool UnderGameDir, bool UnderSystemDir);
public record FileFact(string Name, string Path);
public record FiveMArtifactFact(string Name, string Path, bool InPluginsDir);
public record HashFact(string Name, string Path, string Sha256);

// Unified shape for every extended file-evidence scan (FiveM extra dirs, GTA V install,
// broad Windows user directories, Downloads/Desktop/Documents, Temp) - one fact type instead
// of one per source, since the server only cares about the file itself plus where it came
// from. ArchiveEntries is populated only for .zip/.rar/.7z (via ArchiveInspector) and is
// always empty otherwise - archives are listed, never extracted or executed.
public record FileEvidenceFact(
    string Name, string Path, string Category, long SizeBytes, string Sha256,
    bool Signed, string? Publisher, DateTime? CreatedUtc, DateTime? ModifiedUtc,
    List<string> ArchiveEntries);

// Autostart entries - Run/RunOnce registry keys plus the Startup shell folders.
public record AutostartFact(string Name, string Command, string Source);

// Windows Task Scheduler tasks whose action runs an executable.
public record ScheduledTaskFact(string TaskName, string Command, bool Enabled);

// Windows services backed by a .exe/.sys binary.
public record ServiceFact(string Name, string DisplayName, string Status, string? BinaryPath);

// RPF (RAGE Package File) archives found under FiveM's cache/mods folders - raw facts only.
// Entries is the archive's own internal name list (files/folders packed inside it, read by
// RpfInspector) so an admin can see roughly what a given RPF actually contains, not just its
// file name. The server's rule list decides which specific names/hashes are known-illegal.
public record RpfFact(string Name, string Path, long SizeBytes, string Sha256, List<string> Entries);

// USB mass-storage history from the registry - informational, not scored. LastConnectedUtc
// is the USBSTOR subkey's own last-write time, an approximation, not an exact plug-in log.
public record UsbDeviceFact(string FriendlyName, string DeviceId, DateTime? LastConnectedUtc);

public record SystemFact(
    string OsVersion, string MachineName, bool FiveMProcessFound,
    DateTime? WindowsInstallDate, string? RegionCountry);

// Drives the GUI progress bar - percent complete plus a short human-readable status line.
public record ScanProgress(int Percent, string Status);
