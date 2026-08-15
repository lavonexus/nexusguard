using System.IO;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Finds the GTA V install directory, if any - checked via the Rockstar Games Launcher's own
// registry entry first (authoritative when present), falling back to the handful of paths
// Steam/Epic/Rockstar installs land in by default. Not finding it is normal (FiveM ships its
// own copy of the game assets and doesn't strictly require a separate GTA V install for
// every setup) - never treated as a signal either way.
public static class GtaInstallLocator
{
    private static readonly string[] CommonPaths =
    {
        @"C:\Program Files\Rockstar Games\Grand Theft Auto V",
        @"C:\Program Files (x86)\Rockstar Games\Grand Theft Auto V",
        @"C:\Program Files (x86)\Steam\steamapps\common\Grand Theft Auto V",
        @"C:\Program Files\Steam\steamapps\common\Grand Theft Auto V",
        @"C:\Program Files\Epic Games\GTAV",
        @"C:\Program Files (x86)\Epic Games\GTAV",
    };

    public static string? Find()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(
                @"SOFTWARE\WOW6432Node\Rockstar Games\Grand Theft Auto V");
            if (key?.GetValue("InstallFolder") is string fromRegistry && Directory.Exists(fromRegistry))
                return fromRegistry;
        }
        catch
        {
            // Registry key absent or inaccessible - fall through to the common-paths check.
        }

        foreach (var path in CommonPaths)
        {
            if (Directory.Exists(path)) return path;
        }

        return null;
    }
}
