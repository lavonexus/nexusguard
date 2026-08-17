using System.IO;

namespace NexusGuard.Scanner.Scanners;

// Parses the Windows hosts file (%SystemRoot%\System32\drivers\etc\hosts) for active
// IP-to-hostname mappings - a system-wide way to block or redirect a domain (e.g. an
// anti-cheat's telemetry/update endpoint) without touching any application's own files.
public static class HostsFileScanner
{
    private const int MaxLines = 2000;

    public static List<HostsEntryFact> Scan()
    {
        var facts = new List<HostsEntryFact>();

        string path;
        try
        {
            path = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.System),
                "drivers", "etc", "hosts");
        }
        catch
        {
            return facts;
        }

        if (!File.Exists(path)) return facts;

        string[] lines;
        try
        {
            lines = File.ReadAllLines(path);
        }
        catch
        {
            // Locked/access denied - not itself meaningful.
            return facts;
        }

        foreach (var rawLine in lines.Take(MaxLines))
        {
            var line = rawLine;
            var commentIndex = line.IndexOf('#');
            if (commentIndex >= 0) line = line[..commentIndex];
            line = line.Trim();
            if (line.Length == 0) continue;

            var parts = line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2) continue;

            var ip = parts[0];
            for (var i = 1; i < parts.Length; i++)
            {
                facts.Add(new HostsEntryFact(ip, parts[i]));
            }
        }

        return facts;
    }
}
