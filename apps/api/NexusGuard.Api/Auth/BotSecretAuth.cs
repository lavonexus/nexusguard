using System.Security.Cryptography;
using System.Text;

namespace NexusGuard.Api.Auth;

// Constant-time shared-secret comparison shared by every "X-Bot-Secret"-authenticated
// controller (Controllers/DiscordBotController.cs, Controllers/DiscordTicketBotController.cs).
// Each bot gets its own secret/config key - a leaked ticket-bot secret must never let someone
// impersonate the scan-creation bot, or vice versa.
public static class BotSecretAuth
{
    public static bool Matches(string? provided, string? expected)
    {
        if (string.IsNullOrEmpty(expected) || string.IsNullOrEmpty(provided)) return false;

        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return providedBytes.Length == expectedBytes.Length && CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }
}
