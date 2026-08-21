using System.Diagnostics;
using System.Threading;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Amcache.hve (C:\Windows\AppCompat\Programs\Amcache.hve) - Windows' own per-file application
// inventory, admin-only (same "access denied" ACL as Prefetch, confirmed empirically - this
// scanner only runs because Scanner.exe now requests elevation, see app.manifest). Unlike
// Shimcache/Prefetch, it's not a live registry key or a plain file - it's a separate registry
// hive that has to be temporarily mounted to read, via reg load/unload.
//
// This is a deliberate, narrow, user-confirmed exception to "Scanner.exe never modifies the
// registry": reg load technically creates a registry key (if only to immediately remove it).
// Nothing about Amcache.hve's own contents changes, and nothing is left mounted once this
// method returns - see UnloadHive's retry loop, added after a real failure during development
// where a *different* process (PowerShell's own registry provider, not .NET's) held a cached
// handle open past the point its own script had finished with it and blocked the unload; the
// key name is also made unique per run so a hive left mounted by an earlier crashed process
// can never collide with (or be mistaken for) this run's own mount.
//
// The schema here is the modern Windows 10/11 "Inventory" one (Root\InventoryApplicationFile,
// keyed by "name|hash") - confirmed by loading the real hive on this machine and inspecting it
// directly with reg query, not assumed from older Windows-7-era Amcache documentation (which
// used a different Root\File\{VolumeGuid}\... layout entirely). FileId's value is "0000" +
// the file's own SHA1 in hex - confirmed against the value's actual length (44 hex chars) -
// giving this source something Shimcache/Prefetch don't have: a real hash, still available
// even for a file that's since been deleted.
public static class AmcacheScanner
{
    private const string HivePath = @"C:\Windows\AppCompat\Programs\Amcache.hve";
    private const string InventoryApplicationFileSubKey = @"Root\InventoryApplicationFile";

    public static List<AmcacheFact> Scan()
    {
        var facts = new List<AmcacheFact>();
        var tempKeyName = $"NEXUSGUARD_AMCACHE_{Environment.ProcessId}_{Guid.NewGuid():N}";

        if (!RunReg($"load \"HKLM\\{tempKeyName}\" \"{HivePath}\"")) return facts;

        try
        {
            using var inventoryKey = Registry.LocalMachine.OpenSubKey($@"{tempKeyName}\{InventoryApplicationFileSubKey}");
            if (inventoryKey is null) return facts;

            foreach (var entryName in inventoryKey.GetSubKeyNames())
            {
                try
                {
                    using var entry = inventoryKey.OpenSubKey(entryName);
                    if (entry is null) continue;

                    var path = entry.GetValue("LowerCaseLongPath") as string;
                    if (string.IsNullOrWhiteSpace(path)) continue;

                    var fileId = entry.GetValue("FileId") as string;
                    var sha1 = fileId is { Length: 44 } ? fileId[4..] : null;

                    var publisher = entry.GetValue("Publisher") as string;
                    var linkDateRaw = entry.GetValue("LinkDate") as string;
                    DateTime? linkDateUtc = DateTime.TryParse(linkDateRaw, out var parsed)
                        ? DateTime.SpecifyKind(parsed, DateTimeKind.Utc)
                        : null;

                    long? sizeBytes = entry.GetValue("Size") switch
                    {
                        long l => l,
                        int i => i,
                        _ => null,
                    };

                    facts.Add(new AmcacheFact(path, sha1, publisher, linkDateUtc, sizeBytes));
                }
                catch
                {
                    // One bad entry shouldn't cost the rest.
                }
            }
        }
        catch
        {
            // Leave facts as whatever was collected so far - still unload in the finally below.
        }
        finally
        {
            UnloadHive(tempKeyName);
        }

        return facts;
    }

    private static void UnloadHive(string tempKeyName)
    {
        // .NET's own RegistryKey.Dispose() (via the 'using' blocks above) closes its handles
        // synchronously and reliably - this retry loop is defensive insurance, not a known
        // .NET-side problem, kept after seeing a *different* tool's provider cause exactly
        // this kind of transient failure during development (see the type-level comment).
        for (var attempt = 0; attempt < 3; attempt++)
        {
            if (RunReg($"unload \"HKLM\\{tempKeyName}\"")) return;

            GC.Collect();
            GC.WaitForPendingFinalizers();
            Thread.Sleep(300);
        }
    }

    private static bool RunReg(string arguments)
    {
        try
        {
            var psi = new ProcessStartInfo("reg.exe", arguments)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var process = Process.Start(psi);
            if (process is null) return false;

            process.WaitForExit(15000);
            return process.HasExited && process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }
}
