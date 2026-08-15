using System.Globalization;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Basic environment context - not used for scoring, just useful for an admin reviewing a
// scan to know what machine/OS it ran on, whether the game was even running, and (as a
// light forensic signal) how recently Windows itself was installed.
public static class SystemScanner
{
    public static SystemFact Scan(bool fiveMProcessFound) =>
        new(
            Environment.OSVersion.VersionString,
            Environment.MachineName,
            fiveMProcessFound,
            GetWindowsInstallDate(),
            GetRegionCountry());

    // HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\InstallDate is a Unix timestamp set
    // once at OS install/reset time - a very recently "installed" Windows next to an old
    // scan history elsewhere on the same machine is worth a human noticing, not scoring.
    private static DateTime? GetWindowsInstallDate()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
            if (key?.GetValue("InstallDate") is int unixSeconds)
                return DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime;
        }
        catch
        {
            // Registry access can fail under restricted policies - absence isn't suspicious.
        }
        return null;
    }

    // The Windows region/locale setting, not IP-based geolocation - the admin should read
    // this as "what country this Windows install is configured for", nothing stronger.
    private static string? GetRegionCountry()
    {
        try
        {
            return new RegionInfo(CultureInfo.CurrentCulture.LCID).EnglishName;
        }
        catch
        {
            return null;
        }
    }
}
