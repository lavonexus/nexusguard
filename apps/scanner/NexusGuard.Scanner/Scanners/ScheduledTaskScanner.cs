using System.Diagnostics;
using System.Text.Json;

namespace NexusGuard.Scanner.Scanners;

// Shells out to PowerShell's Get-ScheduledTask rather than parsing `schtasks /fo CSV` text -
// schtasks' column headers and status text are localized (this machine reports its Windows
// region as Turkish), which would silently break a text-column parser. PowerShell object
// property names (TaskName, State, Execute, Arguments) are stable regardless of display
// language, so this asks for exactly those as JSON instead of parsing free text.
public static class ScheduledTaskScanner
{
    public static List<ScheduledTaskFact> Scan()
    {
        var facts = new List<ScheduledTaskFact>();

        string output;
        try
        {
            output = RunPowerShell(
                "Get-ScheduledTask | ForEach-Object { " +
                "$a = $_.Actions | Where-Object { $_.Execute } | Select-Object -First 1; " +
                "[PSCustomObject]@{ TaskName = $_.TaskName; State = $_.State.ToString(); " +
                "Execute = $a.Execute; Arguments = $a.Arguments } " +
                "} | ConvertTo-Json -Compress");
        }
        catch
        {
            return facts; // PowerShell unavailable/blocked by policy - not itself meaningful
        }

        if (string.IsNullOrWhiteSpace(output)) return facts;

        foreach (var entry in ParseEntries(output))
        {
            if (string.IsNullOrWhiteSpace(entry.Execute)) continue;
            if (!LooksLikeExecutable(entry.Execute)) continue;

            var command = string.IsNullOrWhiteSpace(entry.Arguments)
                ? entry.Execute
                : $"{entry.Execute} {entry.Arguments}";

            facts.Add(new ScheduledTaskFact(
                entry.TaskName ?? "(unnamed)", command, entry.State == "Ready" || entry.State == "Running"));
        }

        return facts;
    }

    private static bool LooksLikeExecutable(string execute) =>
        execute.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ||
        execute.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase) ||
        execute.EndsWith(".bat", StringComparison.OrdinalIgnoreCase) ||
        execute.EndsWith(".ps1", StringComparison.OrdinalIgnoreCase);

    private static List<TaskEntry> ParseEntries(string json)
    {
        // Get-ScheduledTask returns a single object (not an array) when there's only one
        // match - ConvertTo-Json then emits a bare object instead of a JSON array.
        var trimmed = json.TrimStart();
        if (trimmed.StartsWith('['))
            return JsonSerializer.Deserialize<List<TaskEntry>>(json) ?? [];

        var single = JsonSerializer.Deserialize<TaskEntry>(json);
        return single is null ? [] : [single];
    }

    private static string RunPowerShell(string command)
    {
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                ArgumentList = { "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command },
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            },
        };

        process.Start();
        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit(15_000);
        return output;
    }

    private record TaskEntry(string? TaskName, string? State, string? Execute, string? Arguments);
}
