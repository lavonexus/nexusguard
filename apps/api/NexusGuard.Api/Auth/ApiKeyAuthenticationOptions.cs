using Microsoft.AspNetCore.Authentication;

namespace NexusGuard.Api.Auth;

public class ApiKeyAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "ApiKey";
    public const string HeaderName = "X-Api-Key";
}
