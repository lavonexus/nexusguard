using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Read-only: reads the currently-active Steam account's ID from the registry key Steam's own
// client writes specifically so other local apps (game overlays, trainers, mod managers) can
// read "who's playing" without asking - this is a bare 32-bit account ID, not a token, and
// doesn't grant access to the account. Converted to a public SteamID64 and reported as-is; the
// server resolves it to a display name/avatar via Steam's own public Web API (SteamProfileService),
// same "raw fact, no opinion" rule every other scanner here follows. Reports nothing if Steam
// isn't installed or isn't currently running - that's a completely normal outcome, not an error.
public static class SteamScanner
{
    private const long SteamId64Base = 76561197960265728L;

    public static SteamFact? Scan()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam\ActiveProcess");
            if (key is null) return null;

            if (key.GetValue("ActiveUser") is not int activeUser || activeUser == 0)
                return null;

            var steamId64 = SteamId64Base + (uint)activeUser;
            return new SteamFact(steamId64.ToString());
        }
        catch
        {
            return null;
        }
    }
}
