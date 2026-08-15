using Microsoft.AspNetCore.Authentication;

namespace NexusGuard.Api.Auth;

public class ScannerTokenAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "ScannerToken";
}
