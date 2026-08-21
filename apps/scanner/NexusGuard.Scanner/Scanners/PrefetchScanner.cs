using System.IO;
using System.Text.RegularExpressions;

namespace NexusGuard.Scanner.Scanners;

// Windows Prefetch (C:\Windows\Prefetch\*.pf) - one file per executable that's ever run,
// created by Windows itself to speed up future launches. Requires admin: the folder is ACL'd
// to Administrators/SYSTEM only, confirmed empirically ("access denied" under a normal token) -
// this scanner only runs at all because Scanner.exe now requests elevation (see app.manifest).
// Deliberately reads only the filename and the .pf file's own timestamp, not the compressed
// binary body inside it (which holds a real run count and a list of last-run times, but
// requires implementing Windows' MAM/Xpress-Huffman decompression from scratch to get at -
// exactly the kind of undocumented-format guesswork this project avoids without extensive
// empirical validation, see ShimcacheScanner's comment on the same principle). The filename
// and file timestamp alone are still real, useful evidence: proof a specific executable ran
// at some point, with an approximate last-run time - the same category of evidence Shimcache
// already provides, just from an independent source.
public static class PrefetchScanner
{
    private const string PrefetchDir = @"C:\Windows\Prefetch";
    private static readonly Regex FileNamePattern = new(@"^(?<exe>.+)-[0-9A-Fa-f]{8}\.pf$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static List<PrefetchFact> Scan()
    {
        var facts = new List<PrefetchFact>();

        string[] files;
        try
        {
            files = Directory.GetFiles(PrefetchDir, "*.pf");
        }
        catch
        {
            // Not elevated, folder missing (Prefetch disabled), or some other access issue -
            // not itself meaningful, just means this source has nothing to add.
            return facts;
        }

        foreach (var path in files)
        {
            try
            {
                var fileName = Path.GetFileName(path);
                var match = FileNamePattern.Match(fileName);
                if (!match.Success) continue;

                var lastModifiedUtc = File.GetLastWriteTimeUtc(path);
                facts.Add(new PrefetchFact(match.Groups["exe"].Value, lastModifiedUtc));
            }
            catch
            {
                // One bad/locked file shouldn't cost the rest.
            }
        }

        return facts;
    }
}
