using System.Text;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Parses the Windows AppCompatCache ("Shimcache") registry value directly, since no
// documented API exists for it - Microsoft has never published this format and it has
// changed across Windows versions. The layout below was derived empirically from a real
// sample captured on a Windows 11 (build 26200) machine: entries are found by scanning for
// the 4-byte ASCII tag "10ts", followed by 8 bytes of unrelated fields, a 2-byte
// little-endian path length, the UTF-16LE path itself, and then an 8-byte FILETIME giving
// the file's last-write time - confirmed byte-for-byte against a real file's own
// LastWriteTimeUtc. A separate entry sub-type (AppX/UWP package cache records) uses a
// different internal layout with no FILETIME at that offset; those are silently skipped
// rather than guessed at, since a wrong timestamp here is worse than a missing one.
public static class ShimcacheScanner
{
    private const string KeyPath = @"SYSTEM\CurrentControlSet\Control\Session Manager\AppCompatCache";
    private const string ValueName = "AppCompatCache";
    private static readonly byte[] Tag = { 0x31, 0x30, 0x74, 0x73 }; // ASCII "10ts"
    private const int UnknownFieldsSize = 8;
    private const int MaxPlausiblePathBytes = 4096;

    public static List<ShimcacheFact> Scan()
    {
        var facts = new List<ShimcacheFact>();

        byte[]? data;
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(KeyPath);
            data = key?.GetValue(ValueName) as byte[];
        }
        catch
        {
            // Key absent or access denied - not itself meaningful.
            return facts;
        }

        if (data is null || data.Length < 4) return facts;

        var seen = new HashSet<(string Path, long Ft)>();

        for (var i = 0; i <= data.Length - 4; i++)
        {
            if (data[i] != Tag[0] || data[i + 1] != Tag[1] || data[i + 2] != Tag[2] || data[i + 3] != Tag[3])
                continue;

            var pathLenOffset = i + 4 + UnknownFieldsSize;
            if (pathLenOffset + 2 > data.Length) continue;

            var pathLen = BitConverter.ToUInt16(data, pathLenOffset);
            if (pathLen == 0 || pathLen > MaxPlausiblePathBytes) continue;

            var pathStart = pathLenOffset + 2;
            if (pathStart + pathLen + 8 > data.Length) continue;

            string path;
            try
            {
                path = Encoding.Unicode.GetString(data, pathStart, pathLen);
            }
            catch
            {
                continue;
            }

            // AppX/UWP package cache entries land here too but use a different internal
            // layout (tab-separated package metadata, no FILETIME at this offset) - a real
            // file path always starts with a drive letter or a UNC prefix.
            var looksLikePath = (path.Length > 2 && path[1] == ':') || path.StartsWith(@"\\", StringComparison.Ordinal);
            if (!looksLikePath) continue;

            var ftOffset = pathStart + pathLen;
            var fileTime = BitConverter.ToInt64(data, ftOffset);
            if (fileTime <= 0) continue;

            DateTime lastModifiedUtc;
            try
            {
                lastModifiedUtc = DateTime.FromFileTimeUtc(fileTime);
            }
            catch
            {
                continue;
            }

            if (lastModifiedUtc.Year < 1990 || lastModifiedUtc.Year > DateTime.UtcNow.Year + 1) continue;

            if (seen.Add((path, fileTime)))
            {
                facts.Add(new ShimcacheFact(path, lastModifiedUtc));
            }
        }

        return facts;
    }
}
