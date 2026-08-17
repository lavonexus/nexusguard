using System.IO;

namespace NexusGuard.Scanner.Scanners;

// Reports every file in FiveM's plugins folder (DLLs there load straight into the client)
// plus everything directly under FiveM's own data directory, tagged with whether it came
// from the plugins folder. No keyword or name matching here - the server decides what's
// suspicious from these raw facts.
public static class FiveMArtifactScanner
{
    public static string FiveMDataDirectory { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "FiveM", "FiveM.app");

    public static List<FiveMArtifactFact> Scan()
    {
        var facts = new List<FiveMArtifactFact>();

        if (!Directory.Exists(FiveMDataDirectory)) return facts;

        var pluginsDir = Path.Combine(FiveMDataDirectory, "plugins");
        foreach (var file in SafeEnumerate(pluginsDir, "*.dll"))
        {
            TryAddFact(facts, file, inPluginsDir: true);
        }

        foreach (var file in SafeEnumerate(FiveMDataDirectory, "*", SearchOption.TopDirectoryOnly))
        {
            TryAddFact(facts, file, inPluginsDir: false);
        }

        return facts;
    }

    private static void TryAddFact(List<FiveMArtifactFact> facts, string file, bool inPluginsDir)
    {
        try
        {
            facts.Add(BuildFact(file, inPluginsDir));
        }
        catch
        {
            // One file's metadata (hash/signature) failing shouldn't cost the whole scan.
        }
    }

    private static FiveMArtifactFact BuildFact(string file, bool inPluginsDir)
    {
        var meta = FileMetadataInspector.Inspect(file);
        return new FiveMArtifactFact(
            Path.GetFileName(file), file, inPluginsDir, meta.Sha256.Length > 0 ? meta.Sha256 : null,
            meta.Signed, meta.Publisher, meta.SignatureTrust);
    }

    private static IEnumerable<string> SafeEnumerate(
        string dir, string pattern, SearchOption option = SearchOption.TopDirectoryOnly)
    {
        if (!Directory.Exists(dir)) return Enumerable.Empty<string>();

        try
        {
            return Directory.EnumerateFiles(dir, pattern, option);
        }
        catch
        {
            return Enumerable.Empty<string>();
        }
    }
}
