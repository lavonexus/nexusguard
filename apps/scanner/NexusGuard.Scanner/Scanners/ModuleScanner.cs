using System.Diagnostics;
using System.IO;

namespace NexusGuard.Scanner.Scanners;

// Reports every DLL loaded into the FiveM game process, plus the two structural facts the
// Detection Engine needs to judge each one: whether it lives under FiveM's own install
// directory, and whether it lives under a Windows system directory. Those are just
// locations, not a verdict - the server decides what "outside both" means.
public static class ModuleScanner
{
    private static readonly string[] GameProcessNames = { "FiveM_GTAProcess", "FiveM", "GTA5" };

    public static bool TryFindGameProcess(out Process? process)
    {
        process = Process.GetProcesses()
            .FirstOrDefault(p => GameProcessNames.Contains(p.ProcessName, StringComparer.OrdinalIgnoreCase));
        return process is not null;
    }

    public static List<ModuleFact> Scan(Process? gameProcess)
    {
        var facts = new List<ModuleFact>();
        if (gameProcess is null) return facts;

        string? gameDir = null;
        try
        {
            gameDir = Path.GetDirectoryName(gameProcess.MainModule?.FileName);
        }
        catch
        {
            // Access denied reading MainModule - still enumerate Modules below for what we can see.
        }

        var systemDir = Environment.GetFolderPath(Environment.SpecialFolder.System);
        var windowsDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);

        ProcessModuleCollection modules;
        try
        {
            modules = gameProcess.Modules;
        }
        catch
        {
            return facts;
        }

        foreach (ProcessModule module in modules)
        {
            var path = module.FileName;
            var underGameDir = gameDir is not null && path.StartsWith(gameDir, StringComparison.OrdinalIgnoreCase);
            var underSystemDir = path.StartsWith(systemDir, StringComparison.OrdinalIgnoreCase)
                || path.StartsWith(windowsDir, StringComparison.OrdinalIgnoreCase);

            // Hash/signature only for modules outside the game and system directories - the
            // only ones the Detection Engine actually scores (see EvaluateModules), and the
            // module list here can run into the hundreds, so this skips the cost everywhere
            // it wouldn't change anything anyway.
            string? sha256 = null;
            bool signed = false;
            string? publisher = null;
            WinTrustChecker.SignatureTrust? signatureTrust = null;
            if (!underGameDir && !underSystemDir)
            {
                try
                {
                    var meta = FileMetadataInspector.Inspect(path);
                    sha256 = meta.Sha256.Length > 0 ? meta.Sha256 : null;
                    signed = meta.Signed;
                    publisher = meta.Publisher;
                    signatureTrust = meta.SignatureTrust;
                }
                catch
                {
                    // Module reported by the process but no longer readable - leave metadata blank.
                }
            }

            facts.Add(new ModuleFact(module.ModuleName, path, underGameDir, underSystemDir, sha256, signed, publisher, signatureTrust));
        }

        return facts;
    }
}
