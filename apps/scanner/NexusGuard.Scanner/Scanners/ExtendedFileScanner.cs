using System.IO;

namespace NexusGuard.Scanner.Scanners;

// Widens the file-evidence sweep from "Desktop/Downloads only" to every location a cheat
// loader, injected DLL, or dropped script realistically ends up: FiveM's own data folders,
// a GTA V install if one exists, the broad Windows per-user/per-machine app-data trees, and
// the user's own Downloads/Desktop/Documents. Every hit is a raw fact (path, hash, signer,
// timestamps, category) - nothing here decides "bad", including well-known ASI-loader
// components (dinput8.dll, ScriptHookV, ...) that are legitimate on almost every install.
public static class ExtendedFileScanner
{
    // .lua/.luac included everywhere alongside the executable types - a Lua executor/injector
    // drops a script file, not a binary, and the server's Detection Engine only ever scores a
    // narrow, keyword-matched subset of these (see CheatSignatureDatabase.SuspiciousLuaKeywords)
    // since a normal FiveM install legitimately has thousands of ordinary resource scripts.
    private static readonly HashSet<string> CodeExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".exe", ".dll", ".sys", ".asi", ".lua", ".luac" };

    private static readonly HashSet<string> WindowsDirExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".exe", ".dll", ".sys", ".asi", ".bat", ".cmd", ".ps1", ".lua", ".luac" };

    private static readonly HashSet<string> UserDirExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".exe", ".dll", ".sys", ".asi", ".bat", ".cmd", ".ps1", ".lua", ".luac", ".zip", ".rar", ".7z" };

    private static readonly HashSet<string> ArchiveExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".zip", ".rar", ".7z" };

    // A global ceiling across every category combined - any one broad root (the whole of
    // %localappdata%, for instance) could otherwise turn a "scan my PC" click into a
    // multi-minute filesystem crawl.
    private const int GlobalFileBudget = 1500;

    public static List<FileEvidenceFact> Scan()
    {
        var facts = new List<FileEvidenceFact>();
        var budget = GlobalFileBudget;

        void ScanRoot(string root, string category, IReadOnlySet<string> extensions, int maxDepth, int maxFiles)
        {
            if (budget <= 0) return;
            var cap = Math.Min(maxFiles, budget);

            foreach (var path in DirectoryWalker.Walk(root, extensions, maxDepth, cap))
            {
                facts.Add(BuildFact(path, category));
                budget--;
                if (budget <= 0) return;
            }
        }

        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        // --- FiveM's own data folders, beyond what FiveMArtifactScanner/RpfScanner already cover ---
        var fiveMApp = FiveMArtifactScanner.FiveMDataDirectory; // %localappdata%\FiveM\FiveM.app
        ScanRoot(Path.Combine(fiveMApp, "data", "cache"), "FiveM", CodeExtensions, 4, 150);
        ScanRoot(Path.Combine(fiveMApp, "data"), "FiveM", CodeExtensions, 3, 100);
        ScanRoot(Path.Combine(fiveMApp, "citizen"), "FiveM", CodeExtensions, 3, 100);
        ScanRoot(Path.Combine(fiveMApp, "server-cache"), "FiveM", CodeExtensions, 3, 100);
        ScanRoot(Path.Combine(fiveMApp, "server-cache-priv"), "FiveM", CodeExtensions, 3, 100);
        ScanRoot(Path.Combine(appData, "CitizenFX"), "FiveM", CodeExtensions, 3, 100);
        ScanRoot(Path.Combine(localAppData, "CitizenFX"), "FiveM", CodeExtensions, 3, 100);

        // --- GTA V install, if found ---
        var gtaRoot = GtaInstallLocator.Find();
        if (gtaRoot is not null)
        {
            ScanRoot(gtaRoot, "GTAV", CodeExtensions, 1, 100);
            ScanRoot(Path.Combine(gtaRoot, "update"), "GTAV", CodeExtensions, 3, 150);
            ScanRoot(Path.Combine(gtaRoot, "x64"), "GTAV", CodeExtensions, 3, 150);
            ScanRoot(Path.Combine(gtaRoot, "mods"), "GTAV", CodeExtensions, 4, 150);
        }

        // --- Broad Windows user/machine directories ---
        ScanRoot(appData, "AppData", WindowsDirExtensions, 3, 300);
        ScanRoot(localAppData, "LocalAppData", WindowsDirExtensions, 3, 300);
        ScanRoot(Path.Combine(localAppData, "Temp"), "Temp", WindowsDirExtensions, 3, 300);
        ScanRoot(Path.Combine(localAppData, "Programs"), "Programs", WindowsDirExtensions, 3, 200);
        ScanRoot(programData, "ProgramData", WindowsDirExtensions, 3, 200);

        // --- User folders, including archives (listed, never extracted) ---
        ScanRoot(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Desktop", UserDirExtensions, 2, 200);
        ScanRoot(Path.Combine(userProfile, "Downloads"), "Downloads", UserDirExtensions, 2, 200);
        ScanRoot(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Documents", UserDirExtensions, 2, 200);

        return facts;
    }

    private static FileEvidenceFact BuildFact(string path, string category)
    {
        var meta = FileMetadataInspector.Inspect(path);
        var entries = ArchiveExtensions.Contains(Path.GetExtension(path))
            ? ArchiveInspector.ReadEntryNames(path)
            : [];

        long size = 0;
        try { size = new FileInfo(path).Length; } catch { /* deleted/locked mid-scan */ }

        return new FileEvidenceFact(
            Path.GetFileName(path), path, category, size, meta.Sha256,
            meta.Signed, meta.Publisher, meta.CreatedUtc, meta.ModifiedUtc, entries);
    }
}
