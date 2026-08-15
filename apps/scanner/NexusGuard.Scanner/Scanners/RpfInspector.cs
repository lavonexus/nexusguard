using System.IO;
using System.Text;

namespace NexusGuard.Scanner.Scanners;

// Reads the internal name list out of an RPF7 archive (the format FiveM/GTA V package
// assets in) - not a full asset extractor, just enough of the container format to answer
// "what's packed inside this file". RPF7 layout: a 16-byte header (magic, entry count,
// names-table length, encryption flag), then one 16-byte table-of-contents entry per file/
// directory, then a block of null-terminated ASCII names referenced by the TOC. The TOC
// entries themselves encode file offsets/sizes/directory-vs-file in a way this class doesn't
// need to fully decode - the names block alone is enough to say what's in the archive, and
// skipping that complexity means fewer ways to misparse a format never officially documented
// by Rockstar (this is reverse-engineered by the modding community, same as every RPF tool).
public static class RpfInspector
{
    private const int MaxEntries = 200;
    private const uint MaxNamesLength = 5 * 1024 * 1024; // sanity bound against a corrupt/hostile header

    public static List<string> ReadEntryNames(string path)
    {
        try
        {
            using var stream = File.OpenRead(path);
            using var reader = new BinaryReader(stream);

            if (stream.Length < 16) return [];

            // The on-disk bytes spell "7FPR", not "RPF7" - Rockstar wrote the magic as the
            // little-endian uint32 value of the ASCII string "RPF7" (0x52504637), which lands
            // the individual bytes in this reversed order.
            var magic = reader.ReadBytes(4);
            if (magic is not [(byte)'7', (byte)'F', (byte)'P', (byte)'R']) return [];

            var entryCount = reader.ReadUInt32();
            var namesLength = reader.ReadUInt32();
            reader.ReadUInt32(); // encryption flag - irrelevant here, only file payloads are ever encrypted

            if (namesLength == 0 || namesLength > MaxNamesLength) return [];

            var tocBytes = checked((long)entryCount * 16);
            var namesStart = 16 + tocBytes;
            if (namesStart + namesLength > stream.Length) return [];

            stream.Seek(namesStart, SeekOrigin.Begin);
            var namesBlock = reader.ReadBytes((int)namesLength);

            return ParseNames(namesBlock);
        }
        catch
        {
            return [];
        }
    }

    private static List<string> ParseNames(byte[] namesBlock)
    {
        var names = new List<string>();
        var start = 0;

        for (var i = 0; i < namesBlock.Length && names.Count < MaxEntries; i++)
        {
            if (namesBlock[i] != 0) continue;

            if (i > start)
            {
                var s = Encoding.ASCII.GetString(namesBlock, start, i - start).Trim();
                if (s.Length > 0 && IsPrintable(s)) names.Add(s);
            }
            start = i + 1;
        }

        return names;
    }

    private static bool IsPrintable(string s)
    {
        foreach (var c in s)
        {
            if (c < 0x20 || c > 0x7E) return false;
        }
        return true;
    }
}
