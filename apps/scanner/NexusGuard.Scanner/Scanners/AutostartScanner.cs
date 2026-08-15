using System.IO;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Everything Windows itself will run automatically at login: the four standard Run/RunOnce
// registry keys (per-user and machine-wide, including the 32-bit view on a 64-bit OS) plus
// the two Startup shell folders (per-user and all-users). Raw facts only - an entry here is
// exactly as likely to be OBS, Discord, or a printer utility as anything else.
public static class AutostartScanner
{
    public static List<AutostartFact> Scan()
    {
        var facts = new List<AutostartFact>();

        ScanRunKey(facts, Registry.CurrentUser, @"Software\Microsoft\Windows\CurrentVersion\Run", "HKCU\\Run");
        ScanRunKey(facts, Registry.CurrentUser, @"Software\Microsoft\Windows\CurrentVersion\RunOnce", "HKCU\\RunOnce");
        ScanRunKey(facts, Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", "HKLM\\Run");
        ScanRunKey(facts, Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce", "HKLM\\RunOnce");
        ScanRunKey(facts, Registry.LocalMachine, @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run", "HKLM\\Run (32-bit)");

        ScanStartupFolder(facts, Environment.GetFolderPath(Environment.SpecialFolder.Startup), "Startup (user)");
        ScanStartupFolder(facts, Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup), "Startup (all users)");

        return facts;
    }

    private static void ScanRunKey(List<AutostartFact> facts, RegistryKey hive, string subKeyPath, string source)
    {
        try
        {
            using var key = hive.OpenSubKey(subKeyPath);
            if (key is null) return;

            foreach (var name in key.GetValueNames())
            {
                if (key.GetValue(name) is not string command || string.IsNullOrWhiteSpace(command)) continue;
                facts.Add(new AutostartFact(name, command, source));
            }
        }
        catch
        {
            // Key absent or access denied - not itself meaningful.
        }
    }

    private static void ScanStartupFolder(List<AutostartFact> facts, string dir, string source)
    {
        if (!Directory.Exists(dir)) return;

        try
        {
            foreach (var file in Directory.EnumerateFiles(dir))
            {
                facts.Add(new AutostartFact(Path.GetFileName(file), file, source));
            }
        }
        catch
        {
            // Access denied - skip.
        }
    }
}
