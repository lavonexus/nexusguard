using System.IO;
using System.Management;

namespace NexusGuard.Scanner.Scanners;

// Every currently loaded kernel-mode/file-system driver (Win32_SystemDriver via WMI) - the
// category ServiceScanner can't see, since .NET's ServiceController.GetServices() only
// returns Win32 services and silently excludes drivers. Readable without elevation. PathName
// comes back from WMI in NT device-path form (\SystemRoot\... or \??\C:\...) rather than a
// normal filesystem path, so it's normalized before being handed to FileMetadataInspector.
public static class DriverScanner
{
    public static List<DriverFact> Scan()
    {
        var facts = new List<DriverFact>();

        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT Name, DisplayName, PathName, State FROM Win32_SystemDriver");
            using var results = searcher.Get();

            foreach (ManagementObject mo in results)
            {
                using (mo)
                {
                    var name = (string)mo["Name"];
                    var displayName = mo["DisplayName"] as string ?? name;
                    var state = mo["State"] as string ?? "Unknown";
                    var rawPath = mo["PathName"] as string;
                    var resolvedPath = NormalizePath(rawPath);

                    string? sha256 = null;
                    bool signed = false;
                    string? publisher = null;
                    WinTrustChecker.SignatureTrust? signatureTrust = null;

                    if (resolvedPath is not null && File.Exists(resolvedPath))
                    {
                        try
                        {
                            var meta = FileMetadataInspector.Inspect(resolvedPath);
                            sha256 = meta.Sha256.Length > 0 ? meta.Sha256 : null;
                            signed = meta.Signed;
                            publisher = meta.Publisher;
                            signatureTrust = meta.SignatureTrust;
                        }
                        catch
                        {
                            // Path resolved but no longer readable - leave metadata blank.
                        }
                    }

                    facts.Add(new DriverFact(name, displayName, state, resolvedPath ?? rawPath, sha256, signed, publisher, signatureTrust));
                }
            }
        }
        catch
        {
            // WMI unavailable (locked-down environment) - drivers are just one signal source.
        }

        return facts;
    }

    private static readonly string WindowsDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);

    private static string? NormalizePath(string? rawPath)
    {
        if (string.IsNullOrWhiteSpace(rawPath)) return null;

        var path = rawPath.Trim('"');

        if (path.StartsWith(@"\SystemRoot\", StringComparison.OrdinalIgnoreCase))
        {
            return Path.Combine(WindowsDir, path[@"\SystemRoot\".Length..]);
        }

        if (path.StartsWith(@"\??\", StringComparison.Ordinal))
        {
            path = path[4..];
        }

        // Some entries are a bare driver name with no path at all (rare, purely virtual/bus
        // drivers) - nothing to inspect on disk for those.
        return path.Contains('\\') || path.Contains(':') ? path : null;
    }
}
