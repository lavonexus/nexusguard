using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace NexusGuard.Scanner.Scanners;

public record FileMetadata(string Sha256, bool Signed, string? Publisher, DateTime? CreatedUtc, DateTime? ModifiedUtc);

// Shared by every scanner that reports on individual files (extended file scan, process
// executables, ...). Reads only what's needed to describe a file - hash, Authenticode signer
// if present, timestamps - never opens it as anything other than bytes/a certificate query,
// and never runs it. A file this can't read (locked, access denied, deleted mid-scan) is
// reported as absent metadata, not as suspicious - most legitimate system files are
// inaccessible without elevation too.
public static class FileMetadataInspector
{
    private const long MaxHashBytes = 100 * 1024 * 1024;

    public static FileMetadata Inspect(string path)
    {
        string sha256 = "";
        bool signed = false;
        string? publisher = null;
        DateTime? createdUtc = null;
        DateTime? modifiedUtc = null;

        try
        {
            var info = new FileInfo(path);
            createdUtc = info.CreationTimeUtc;
            modifiedUtc = info.LastWriteTimeUtc;

            if (info.Length > 0 && info.Length <= MaxHashBytes)
            {
                using var stream = File.OpenRead(path);
                sha256 = Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
            }
        }
        catch
        {
            // Locked/deleted/inaccessible - leave hash/timestamps blank rather than fail.
        }

        try
        {
            // Only reads the embedded Authenticode certificate if one exists - this is
            // "is it signed and by whom", not full chain/revocation validation.
            using var cert = X509Certificate.CreateFromSignedFile(path);
            publisher = cert.Subject;
            signed = !string.IsNullOrEmpty(publisher);
        }
        catch
        {
            // No embedded signature, or the file isn't a PE/signable format - unsigned is
            // extremely common and not inherently suspicious (most user tools are unsigned).
        }

        return new FileMetadata(sha256, signed, publisher, createdUtc, modifiedUtc);
    }
}
