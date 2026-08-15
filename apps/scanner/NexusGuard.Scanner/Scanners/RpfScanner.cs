using System.IO;
using System.Security.Cryptography;

namespace NexusGuard.Scanner.Scanners;

// RPF (RAGE Package File) is the archive format FiveM/GTA V store game assets in. Some
// cheats replace a stock RPF with a modified one (no fall damage, no stamina drain, etc.)
// under FiveM's cache or a "mods" override folder. This only reports what's found - name,
// path, size, hash - never which ones are bad; the server's rule list decides that from a
// small starter list of known-illegal names/hashes (see DetectionEngine.EvaluateRpfFiles).
public static class RpfScanner
{
    private const long MaxHashBytes = 200 * 1024 * 1024; // skip hashing anything absurdly large
    private const int MaxFiles = 500; // FiveM's cache can hold thousands of stock RPFs

    public static List<RpfFact> Scan()
    {
        var facts = new List<RpfFact>();
        var searchDirs = new[]
        {
            Path.Combine(FiveMArtifactScanner.FiveMDataDirectory, "data", "cache"),
            Path.Combine(FiveMArtifactScanner.FiveMDataDirectory, "mods"),
        };

        foreach (var dir in searchDirs)
        {
            if (!Directory.Exists(dir)) continue;

            foreach (var path in SafeEnumerate(dir))
            {
                if (facts.Count >= MaxFiles) return facts;

                try
                {
                    var info = new FileInfo(path);
                    var sha256 = info.Length > 0 && info.Length <= MaxHashBytes ? HashFile(path) : "";
                    var entries = RpfInspector.ReadEntryNames(path);
                    facts.Add(new RpfFact(info.Name, path, info.Length, sha256, entries));
                }
                catch
                {
                    // File locked/deleted mid-scan - skip rather than fail the whole scan.
                }
            }
        }

        return facts;
    }

    private static IEnumerable<string> SafeEnumerate(string dir)
    {
        try
        {
            return Directory.EnumerateFiles(dir, "*.rpf", SearchOption.AllDirectories);
        }
        catch
        {
            return Enumerable.Empty<string>();
        }
    }

    private static string HashFile(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }
}
