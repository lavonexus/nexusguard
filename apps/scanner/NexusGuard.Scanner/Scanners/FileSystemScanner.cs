using System.IO;

namespace NexusGuard.Scanner.Scanners;

// Reports every .exe/.dll sitting directly in Desktop and Downloads - the places people
// actually download tools to. No name matching here; the server's Detection Engine applies
// its own signature list to this raw listing.
public static class FileSystemScanner
{
    private static readonly string[] ScannedExtensions = { ".exe", ".dll" };

    public static List<FileFact> Scan()
    {
        var facts = new List<FileFact>();

        var directories = new[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads"),
        };

        foreach (var dir in directories)
        {
            if (!Directory.Exists(dir)) continue;

            IEnumerable<string> files;
            try
            {
                files = Directory.EnumerateFiles(dir, "*", SearchOption.TopDirectoryOnly);
            }
            catch
            {
                continue;
            }

            foreach (var file in files)
            {
                var ext = Path.GetExtension(file);
                if (!ScannedExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase)) continue;

                facts.Add(new FileFact(Path.GetFileName(file), file));
            }
        }

        return facts;
    }
}
