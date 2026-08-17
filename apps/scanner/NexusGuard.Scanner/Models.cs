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
    bool Signed, string? Publisher, string? ParentProcessName,
    NexusGuard.Scanner.Scanners.WinTrustChecker.SignatureTrust? SignatureTrust);
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
    List<string> ArchiveEntries,
    NexusGuard.Scanner.Scanners.WinTrustChecker.SignatureTrust? SignatureTrust);

// Autostart entries - Run/RunOnce registry keys plus the Startup shell folders.
public record AutostartFact(string Name, string Command, string Source);

// Windows Task Scheduler tasks whose action runs an executable.
public record ScheduledTaskFact(string TaskName, string Command, bool Enabled);

// Windows services backed by a .exe/.sys binary. Note: ServiceController.GetServices() (used
// by ServiceScanner) only returns Win32 services - .NET's API deliberately excludes
// kernel-mode and file-system drivers, which is exactly why DriverScanner exists separately.
public record ServiceFact(string Name, string DisplayName, string Status, string? BinaryPath);

// Currently loaded kernel-mode/file-system drivers (Win32_SystemDriver via WMI) - the one
// category Windows itself refuses to load unsigned on x64 without Test Mode or a disabled
// Secure Boot, which makes SignatureTrust here a much stronger signal than on an ordinary
// user-mode exe. Still reported as a raw fact, not scored - see ShimcacheFact for why.
public record DriverFact(
    string Name, string DisplayName, string State, string? PathName, string? Sha256,
    bool Signed, string? Publisher,
    NexusGuard.Scanner.Scanners.WinTrustChecker.SignatureTrust? SignatureTrust);

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

// Windows' own installed-application record (Uninstall registry keys) - ExecutablePathExists
// is the one opinion-adjacent field here, but it's still just a raw fact ("does this path
// exist right now"), not a judgment about whether the entry is suspicious. The server's
// Detection Engine is what decides that, same as everywhere else.
public record InstalledApplicationFact(
    string DisplayName, string? Publisher, string? DisplayVersion, string? InstallLocation,
    DateTime? InstallDate, string? UninstallString, bool ExecutablePathExists);

// Weak, informational-only UEFI/Secure Boot/TPM/firmware-boot-entry facts - never scored, same
// treatment as UsbDeviceFact. Verifying the firmware image itself hasn't been tampered with
// would need a kernel driver or a hardware SPI programmer, which this scanner deliberately
// never uses (see the read-only guarantee) - these are just the handful of UEFI-adjacent facts
// readable from user mode without one. Disabling Secure Boot has plenty of legitimate reasons
// (Linux dual-boot, older hardware, a pending BIOS update) and is not itself evidence of
// anything on its own.
public record FirmwareFact(
    bool IsUefiBoot, bool? SecureBootEnabled,
    bool? TpmPresent, bool? TpmEnabled, bool? TpmActivated, string? TpmSpecVersion,
    List<FirmwareBootEntry> BootEntries);

public record FirmwareBootEntry(string Identifier, string? Description, string? Path);

// A bare SteamID64 read from the local Steam client's own registry key - see SteamScanner's
// own comment for why this isn't a sensitive token. The server resolves it to a display name/
// avatar via Steam's public Web API; the scanner never does that lookup itself.
public record SteamFact(string SteamId64);

// AppCompatCache ("Shimcache") entries - Windows' own record of executables it has evaluated
// for compatibility, which can retain evidence of a file that ran and was later deleted long
// after Prefetch/recent-files evidence has rotated out. Readable without elevation (unlike
// Amcache.hve and the Prefetch folder, both admin-only - see ShimcacheScanner for why those
// two are deliberately not read here). LastModifiedUtc is the *file's own* last-write time as
// Windows recorded it at cache-insertion time, not a "last executed at" timestamp - Shimcache
// proves the file was present and inspected by Windows, not that it was run. Informational,
// not scored, same treatment as UsbDeviceFact/FirmwareFact.
public record ShimcacheFact(string Path, DateTime LastModifiedUtc);

// Drives the GUI progress bar - percent complete plus a short human-readable status line.
public record ScanProgress(int Percent, string Status);
