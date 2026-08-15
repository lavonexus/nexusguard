using System.IO;
using System.Security.Cryptography;

namespace NexusGuard.Scanner.Scanners;

// Hashes every file/module path discovered by the other scanners - a scope decision (which
// files are worth fingerprinting), not a verdict about which ones are bad. That judgment,
// like everything else, belongs to the server.
public static class HashScanner
{
    public static List<HashFact> Hash(IEnumerable<string> filePaths)
    {
        var facts = new List<HashFact>();

        foreach (var path in filePaths.Distinct())
        {
            if (!File.Exists(path)) continue;

            try
            {
                using var stream = File.OpenRead(path);
                var hash = Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
                facts.Add(new HashFact(Path.GetFileName(path), path, hash));
            }
            catch
            {
                // File locked/deleted between discovery and hashing - skip rather than fail
                // the whole scan over one file.
            }
        }

        return facts;
    }
}
