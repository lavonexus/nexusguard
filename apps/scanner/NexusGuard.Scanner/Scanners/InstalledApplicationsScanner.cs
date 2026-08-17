using System.IO;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Windows' own "installed applications" record - the Uninstall registry keys every installer
// (MSI or not) is expected to register an entry in. This is the one place a program that's
// since been deleted can still leave real, safely-readable evidence behind: the key frequently
// survives even after the files themselves are gone, which is exactly the "historical artifact"
// case the server's Detection Engine treats differently from something found live on disk.
// Read-only: this only ever reads registry values and checks whether a path exists, never
// writes, deletes, or launches anything.
public static class InstalledApplicationsScanner
{
    private const int MaxApplications = 500;

    private static readonly (RegistryHive Hive, string SubKey)[] UninstallRoots =
    {
        (RegistryHive.LocalMachine, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (RegistryHive.LocalMachine, @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (RegistryHive.CurrentUser, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    };

    public static List<InstalledApplicationFact> Scan()
    {
        var facts = new List<InstalledApplicationFact>();

        foreach (var (hive, subKeyPath) in UninstallRoots)
        {
            if (facts.Count >= MaxApplications) break;

            try
            {
                using var baseKey = RegistryKey.OpenBaseKey(hive, RegistryView.Default);
                using var uninstallKey = baseKey.OpenSubKey(subKeyPath);
                if (uninstallKey is null) continue;

                foreach (var entryName in uninstallKey.GetSubKeyNames())
                {
                    if (facts.Count >= MaxApplications) break;

                    try
                    {
                        using var entry = uninstallKey.OpenSubKey(entryName);
                        if (entry is null) continue;

                        var fact = TryBuildFact(entry);
                        if (fact is not null) facts.Add(fact);
                    }
                    catch
                    {
                        // One malformed/inaccessible entry shouldn't abort the whole sweep.
                    }
                }
            }
            catch
            {
                // Registry root not present on this machine/edition - move on.
            }
        }

        return facts;
    }

    private static InstalledApplicationFact? TryBuildFact(RegistryKey entry)
    {
        var displayName = entry.GetValue("DisplayName") as string;
        if (string.IsNullOrWhiteSpace(displayName)) return null;

        // SystemComponent=1 marks a Windows/driver-runtime sub-piece (a .NET redistributable,
        // a codec, ...) rather than something a user installed themselves - not useful signal.
        if (entry.GetValue("SystemComponent") is int sysComponent && sysComponent == 1) return null;

        var publisher = entry.GetValue("Publisher") as string;
        var displayVersion = entry.GetValue("DisplayVersion") as string;
        var installLocation = entry.GetValue("InstallLocation") as string;
        var uninstallString = entry.GetValue("UninstallString") as string;
        var installDate = ParseInstallDate(entry.GetValue("InstallDate") as string);

        var exists = PathLikelyExists(installLocation, uninstallString);

        return new InstalledApplicationFact(
            StripNul(displayName)!, StripNul(publisher), StripNul(displayVersion),
            StripNul(installLocation), installDate, StripNul(uninstallString), exists);
    }

    // A handful of older/malformed installers leave a stray embedded NUL character in their
    // Uninstall registry values (a REG_SZ that was never really null-terminated cleanly). .NET
    // reads it through fine as a C# string, but Postgres's jsonb parser rejects that character
    // outright as untranslatable once it is JSON-serialized, turning one flaky registry entry
    // into a 500 for the whole scan submission.
    private static string? StripNul(string? value) => value?.Replace("\0", string.Empty);

    // Best-effort only - MSI-based UninstallStrings ("MsiExec.exe /X{GUID}") don't name a real
    // path at all, in which case this falls back to "unknown" (reported as ExecutablePathExists
    // = false), which the server treats as a weaker signal, not as proof of removal.
    private static bool PathLikelyExists(string? installLocation, string? uninstallString)
    {
        if (!string.IsNullOrWhiteSpace(installLocation))
        {
            try { if (Directory.Exists(installLocation)) return true; }
            catch { /* inaccessible - fall through */ }
        }

        var candidate = ExtractPathFromUninstallString(uninstallString);
        if (candidate is null) return false;

        try { return File.Exists(candidate); }
        catch { return false; }
    }

    private static string? ExtractPathFromUninstallString(string? uninstallString)
    {
        if (string.IsNullOrWhiteSpace(uninstallString)) return null;
        if (uninstallString.Contains("MsiExec", StringComparison.OrdinalIgnoreCase)) return null;

        var trimmed = uninstallString.Trim();
        if (trimmed.StartsWith('"'))
        {
            var end = trimmed.IndexOf('"', 1);
            return end > 1 ? trimmed[1..end] : null;
        }

        // Unquoted paths can legitimately contain spaces themselves, so a plain split is
        // unreliable - only trust the unquoted form when it already resolves as-is.
        return trimmed;
    }

    private static DateTime? ParseInstallDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw) || raw.Length != 8) return null;
        return DateTime.TryParseExact(raw, "yyyyMMdd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out var date)
            ? date
            : null;
    }
}
