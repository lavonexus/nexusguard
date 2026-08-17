using System.Management;

namespace NexusGuard.Scanner.Scanners;

// Reports every running process - name, pid, path, hash, signer, and its parent process -
// with no opinion about which ones are suspicious - that call belongs to the server's
// Detection Engine, which applies its own signature list to this raw list instead of
// trusting a pre-filtered one. WMI (Win32_Process) is used instead of System.Diagnostics.
// Process because it exposes ExecutablePath and ParentProcessId directly, which the
// Process class doesn't - avoids a separate P/Invoke just for the parent link.
public static class ProcessScanner
{
    public static List<ProcessFact> Scan()
    {
        var facts = new List<ProcessFact>();
        var rows = new List<(uint Pid, string Name, string? Path, uint ParentPid)>();

        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT ProcessId, Name, ExecutablePath, ParentProcessId FROM Win32_Process");
            using var results = searcher.Get();

            foreach (ManagementObject mo in results)
            {
                using (mo)
                {
                    var pid = (uint)mo["ProcessId"];
                    var name = (string)mo["Name"];
                    var path = mo["ExecutablePath"] as string;
                    var parentPid = (uint)mo["ParentProcessId"];
                    rows.Add((pid, name, path, parentPid));
                }
            }
        }
        catch
        {
            // WMI unavailable (locked-down environment) - fall back to nothing rather than
            // fail the whole scan; process facts are just one of several signal sources.
            return facts;
        }

        var pidToName = rows.ToDictionary(r => r.Pid, r => r.Name);

        foreach (var row in rows)
        {
            string? sha256 = null;
            bool signed = false;
            string? publisher = null;
            WinTrustChecker.SignatureTrust? signatureTrust = null;

            if (!string.IsNullOrWhiteSpace(row.Path))
            {
                try
                {
                    var meta = FileMetadataInspector.Inspect(row.Path);
                    sha256 = meta.Sha256.Length > 0 ? meta.Sha256 : null;
                    signed = meta.Signed;
                    publisher = meta.Publisher;
                    signatureTrust = meta.SignatureTrust;
                }
                catch
                {
                    // Path reported by WMI but no longer readable - leave metadata blank.
                }
            }

            pidToName.TryGetValue(row.ParentPid, out var parentName);

            facts.Add(new ProcessFact(row.Name, (int)row.Pid, row.Path, sha256, signed, publisher, parentName, signatureTrust));
        }

        return facts;
    }
}
