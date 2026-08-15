using SharpCompress.Archives;

namespace NexusGuard.Scanner.Scanners;

// Lists what's inside a .zip/.rar/.7z without ever extracting a file to disk or running
// anything - SharpCompress's archive API reads the central directory/header only when we
// just enumerate .Entries. This exists purely so an admin can see "this archive contains
// Loader.exe and config.ini" without needing to open it themselves.
public static class ArchiveInspector
{
    private const int MaxEntries = 200;

    public static List<string> ReadEntryNames(string path)
    {
        try
        {
            using var archive = ArchiveFactory.OpenArchive(path);
            var names = new List<string>();

            foreach (var entry in archive.Entries)
            {
                if (entry.IsDirectory) continue;
                if (names.Count >= MaxEntries) break;
                names.Add(entry.Key ?? "(unnamed)");
            }

            return names;
        }
        catch
        {
            // Password-protected, corrupt, or an unsupported variant - absence of a listing
            // isn't itself a signal.
            return [];
        }
    }
}
