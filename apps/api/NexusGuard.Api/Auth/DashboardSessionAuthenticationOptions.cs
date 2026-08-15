using Microsoft.AspNetCore.Authentication;

namespace NexusGuard.Api.Auth;

public class DashboardSessionAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "DashboardSession";
    public const string CookieName = "ng_session";
}
