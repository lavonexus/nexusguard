using System.Security.Cryptography;
using System.Text;

namespace NexusGuard.Api.Services;

public class TokenService : ITokenService
{
    public string GenerateApiKey() =>
        "ng_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();

    public string GeneratePin(int digits = 6)
    {
        if (digits < 4 || digits > 10) throw new ArgumentOutOfRangeException(nameof(digits));
        var max = (int)Math.Pow(10, digits);
        var value = RandomNumberGenerator.GetInt32(0, max);
        return value.ToString().PadLeft(digits, '0');
    }

    public string GenerateOpaqueToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    public string Prefix(string secret, int length = 12) =>
        secret.Length <= length ? secret : secret[..length];

    public string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public bool Verify(string value, string hash)
    {
        var computed = Encoding.UTF8.GetBytes(Hash(value));
        var expected = Encoding.UTF8.GetBytes(hash);
        return computed.Length == expected.Length && CryptographicOperations.FixedTimeEquals(computed, expected);
    }
}
