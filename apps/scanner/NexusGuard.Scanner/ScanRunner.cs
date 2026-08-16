using System.IO;
using System.Text.Json;
using NexusGuard.Scanner.Scanners;

namespace NexusGuard.Scanner;

// Orchestrates a full scan against an already-issued scan token, reporting percent-complete
// progress along the way for the GUI's progress bar. This is the same raw-facts-only flow
// the old CLI ran - only the UI around it changed.
public static class ScanRunner
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static async Task<CompleteResponse> RunAsync(
        ApiClient api, string scanToken, IProgress<ScanProgress> progress, CancellationToken ct = default)
    {
        progress.Report(new ScanProgress(3, "Collecting running processes..."));
        var processFacts = ProcessScanner.Scan();
        await Report(api, scanToken, "Process", processFacts);

        progress.Report(new ScanProgress(10, "Collecting modules loaded into the FiveM process..."));
        var hasGameProcess = ModuleScanner.TryFindGameProcess(out var gameProcess);
        List<ModuleFact> moduleFacts;
        using (gameProcess)
        {
            moduleFacts = ModuleScanner.Scan(gameProcess);
        }
        await Report(api, scanToken, "Module", moduleFacts);

        progress.Report(new ScanProgress(15, "Collecting files from Desktop/Downloads..."));
        var fileFacts = FileSystemScanner.Scan();
        await Report(api, scanToken, "File", fileFacts);

        progress.Report(new ScanProgress(20, "Collecting FiveM install data..."));
        var fivemFacts = FiveMArtifactScanner.Scan();
        await Report(api, scanToken, "FiveMArtifact", fivemFacts);

        progress.Report(new ScanProgress(24, "Scanning FiveM cache for modified RPF archives..."));
        var rpfFacts = RpfScanner.Scan();
        if (rpfFacts.Count > 0)
        {
            await Report(api, scanToken, "Rpf", rpfFacts);
        }

        progress.Report(new ScanProgress(27, "Reading USB connection history..."));
        var usbFacts = UsbHistoryScanner.Scan();
        if (usbFacts.Count > 0)
        {
            await Report(api, scanToken, "UsbHistory", usbFacts);
        }

        progress.Report(new ScanProgress(29, "Checking system info..."));
        var systemFact = SystemScanner.Scan(hasGameProcess);
        await Report(api, scanToken, "System", new[] { systemFact });

        progress.Report(new ScanProgress(32, "Checking startup entries..."));
        var autostartFacts = AutostartScanner.Scan();
        if (autostartFacts.Count > 0)
        {
            await Report(api, scanToken, "Autostart", autostartFacts);
        }

        progress.Report(new ScanProgress(36, "Checking scheduled tasks..."));
        var taskFacts = ScheduledTaskScanner.Scan();
        if (taskFacts.Count > 0)
        {
            await Report(api, scanToken, "ScheduledTask", taskFacts);
        }

        progress.Report(new ScanProgress(40, "Checking Windows services..."));
        var serviceFacts = ServiceScanner.Scan();
        if (serviceFacts.Count > 0)
        {
            await Report(api, scanToken, "Service", serviceFacts);
        }

        progress.Report(new ScanProgress(43, "Checking installed application history..."));
        var installedAppFacts = InstalledApplicationsScanner.Scan();
        if (installedAppFacts.Count > 0)
        {
            await Report(api, scanToken, "InstalledApplication", installedAppFacts);
        }

        progress.Report(new ScanProgress(44, "Checking UEFI/Secure Boot/TPM state..."));
        var firmwareFact = FirmwareScanner.Scan();
        await Report(api, scanToken, "Firmware", new[] { firmwareFact });

        progress.Report(new ScanProgress(44, "Checking Steam account..."));
        var steamFact = SteamScanner.Scan();
        if (steamFact is not null)
        {
            await Report(api, scanToken, "Steam", new[] { steamFact });
        }

        progress.Report(new ScanProgress(45, "Scanning FiveM, GTA V, and Windows user directories..."));
        var extendedFacts = ExtendedFileScanner.Scan();
        if (extendedFacts.Count > 0)
        {
            await Report(api, scanToken, "FileEvidence", extendedFacts);
        }

        var candidatePaths = fileFacts.Select(f => f.Path)
            .Concat(fivemFacts.Select(f => f.Path))
            .Concat(moduleFacts.Where(m => !m.UnderSystemDir).Select(m => m.Path))
            .ToList();

        progress.Report(new ScanProgress(68, "Hashing candidate files..."));
        var hashFacts = HashScanner.Hash(candidatePaths);
        if (hashFacts.Count > 0)
        {
            await Report(api, scanToken, "Hash", hashFacts);
        }

        const long maxYaraFileBytes = 20 * 1024 * 1024;
        var yaraCandidates = candidatePaths
            .Where(p => p.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ||
                        p.EndsWith(".dll", StringComparison.OrdinalIgnoreCase))
            .Distinct()
            .Where(File.Exists)
            .Where(p => new FileInfo(p).Length is > 0 and <= maxYaraFileBytes)
            .ToList();

        if (yaraCandidates.Count > 0)
        {
            for (var i = 0; i < yaraCandidates.Count; i++)
            {
                ct.ThrowIfCancellationRequested();
                var path = yaraCandidates[i];
                var percent = 70 + (int)(20.0 * (i + 1) / yaraCandidates.Count);
                progress.Report(new ScanProgress(percent, $"Scanning {Path.GetFileName(path)} ({i + 1}/{yaraCandidates.Count})..."));

                byte[] content;
                try
                {
                    content = await File.ReadAllBytesAsync(path, ct);
                }
                catch
                {
                    continue;
                }

                await api.SubmitFileAsync(scanToken, Path.GetFileName(path), content);
            }
        }

        progress.Report(new ScanProgress(95, "Finalizing - server is evaluating the results..."));
        var result = await api.CompleteAsync(scanToken);

        progress.Report(new ScanProgress(100, "Scan complete."));
        return result;
    }

    private static async Task Report<T>(ApiClient client, string token, string resultType, IReadOnlyCollection<T> facts)
    {
        var dataJson = JsonSerializer.Serialize(facts, JsonOptions);
        await client.SubmitResultAsync(token, resultType, dataJson);
    }
}
