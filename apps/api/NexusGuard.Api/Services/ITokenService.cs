namespace NexusGuard.Api.Services;

// Centralizes generation and hashing of every secret the system hands out: server API
// keys, scan PINs, and scan tokens. Nothing here is ever persisted in plaintext.
public interface ITokenService
{
    string GenerateApiKey();
    string GeneratePin(int digits = 6);
    string GenerateOpaqueToken();

    /// First N characters of a secret, safe to store in plaintext for indexed lookup.
    string Prefix(string secret, int length = 12);

    string Hash(string value);
    bool Verify(string value, string hash);
}
