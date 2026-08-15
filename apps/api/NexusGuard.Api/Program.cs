using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
// Render's managed Postgres (and most other PaaS databases) hand back a postgres:// URI, not
// the ADO.NET keyword=value string Npgsql expects. DATABASE_URL wins whenever it's present -
// appsettings.json's ConnectionStrings:Default is only ever a local-dev fallback (it always
// has *some* value there, pointing at localhost, so checking "is it empty" first would never
// fall through to DATABASE_URL - confirmed by an actual failed deploy trying to reach
// 127.0.0.1:5432 in production before this was fixed).
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string? connectionString;
if (!string.IsNullOrEmpty(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    connectionString =
        $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};" +
        $"Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}
else
{
    connectionString = builder.Configuration.GetConnectionString("Default");
}

builder.Services.AddDbContext<NexusGuardDbContext>(options =>
    options.UseNpgsql(connectionString));

// --- Domain services ---
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IScanSessionService, ScanSessionService>();
builder.Services.AddScoped<IDetectionEngine, DetectionEngine>();
builder.Services.AddScoped<IUserSessionService, UserSessionService>();
builder.Services.AddHttpClient<IDiscordOAuthService, DiscordOAuthService>();
builder.Services.AddHttpClient<IGoogleOAuthService, GoogleOAuthService>();
builder.Services.AddScoped<IAiSummaryService, AiSummaryService>();
builder.Services.AddScoped<IScannerThemeService, ScannerThemeService>();

// Singleton: compiling YARA rules is the expensive part and the native YaraContext they
// depend on is meant to live for the process lifetime, not be recreated per request.
builder.Services.AddSingleton<IYaraScanEngine, YaraScanEngine>();

// --- Auth: three independent schemes, never mixed ---
// ApiKey           -> server-to-server requests, identifies a Server
// ScannerToken     -> Scanner.exe requests, identifies a single in-flight ScanSession
// DashboardSession -> a logged-in Discord user in the browser (Phase 6)
builder.Services.AddAuthentication()
    .AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(
        ApiKeyAuthenticationOptions.SchemeName, _ => { })
    .AddScheme<ScannerTokenAuthenticationOptions, ScannerTokenAuthenticationHandler>(
        ScannerTokenAuthenticationOptions.SchemeName, _ => { })
    .AddScheme<DashboardSessionAuthenticationOptions, DashboardSessionAuthenticationHandler>(
        DashboardSessionAuthenticationOptions.SchemeName, _ => { });

builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "NexusGuard API", Version = "v1" });

    options.AddSecurityDefinition(ApiKeyAuthenticationOptions.SchemeName, new OpenApiSecurityScheme
    {
        Name = ApiKeyAuthenticationOptions.HeaderName,
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Server API key issued by POST /api/servers"
    });
    options.AddSecurityDefinition(ScannerTokenAuthenticationOptions.SchemeName, new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        Description = "Short-lived scan token from POST /api/scanner/session"
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

var app = builder.Build();

// Force the YARA rules to compile now, not on the first /api/scanner/files request - a
// broken rule file should fail startup, not a scan.
app.Services.GetRequiredService<IYaraScanEngine>();

// Applies any pending migrations on startup - the dev database always ends up on the
// latest schema without a manual `dotnet ef database update` step, and unlike
// EnsureCreated() this can evolve an existing database instead of only creating one from
// scratch. New schema changes: `dotnet ef migrations add <Name>` from this project's
// directory, then just restart the API.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NexusGuardDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// In production this sits behind Caddy, which terminates TLS and forwards plain HTTP - without
// this, the app has no way to know the original request was HTTPS (UseHttpsRedirection would
// otherwise redirect-loop, and the OAuth callback URLs would come out http://). ForwardedFor/
// ForwardedProto are trusted unconditionally here because Caddy is the only thing that can
// reach this container's port at all (see docker-compose.prod.yml - it isn't published to the
// host).
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
// Caddy's container IP isn't known ahead of time (Docker assigns it, and it can change
// between restarts) and the default KnownProxies/KnownNetworks only trust loopback - clearing
// both trusts whatever forwards to this container, which is safe here specifically because the
// container's port is never published to the host (only Caddy, over the compose network, can
// reach it at all).
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Unauthenticated on purpose - this is only ever polled by the hosting platform's own health
// checker (Render, etc.), never by a browser or the dashboard.
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
