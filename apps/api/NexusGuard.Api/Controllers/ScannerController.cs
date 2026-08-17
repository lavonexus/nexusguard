using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NexusGuard.Api.Auth;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;
using NexusGuard.Api.Services;

namespace NexusGuard.Api.Controllers;

[ApiController]
[Route("api/scanner")]
public class ScannerController : ControllerBase
{
    private const int MaxFileBytes = 25 * 1024 * 1024;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IScanSessionService _scanSessions;
    private readonly IDetectionEngine _detectionEngine;
    private readonly IYaraScanEngine _yara;
    private readonly IAiSummaryService _aiSummary;
    private readonly IScannerThemeService _themes;
    private readonly ISteamProfileService _steamProfiles;

    public ScannerController(
        IScanSessionService scanSessions, IDetectionEngine detectionEngine, IYaraScanEngine yara,
        IAiSummaryService aiSummary, IScannerThemeService themes, ISteamProfileService steamProfiles)
    {
        _scanSessions = scanSessions;
        _detectionEngine = detectionEngine;
        _yara = yara;
        _aiSummary = aiSummary;
        _themes = themes;
        _steamProfiles = steamProfiles;
    }

    // The only anonymous endpoint in this controller: Scanner.exe trades the human-entered
    // PIN for a short-lived scan token. Everything below this point requires that token.
    [HttpPost("session")]
    [AllowAnonymous]
    public async Task<ActionResult<ScannerSessionResponse>> StartSession(ScannerSessionRequest request)
    {
        var result = await _scanSessions.ExchangePinAsync(request.ScanId, request.Pin);
        if (result is null) return Unauthorized("Invalid, already-used, or expired PIN.");

        var (session, scanToken) = result.Value;
        var theme = await _themes.GetAsync(session.ServerId);
        return new ScannerSessionResponse(scanToken, session.ScanTokenExpiresAt!.Value, theme);
    }

    // Same exchange as above, but for the Scanner.exe GUI, which only ever asks the player
    // for a PIN - no scan ID to copy/paste. Scoped to Pending sessions only.
    [HttpPost("session/by-pin")]
    [AllowAnonymous]
    public async Task<ActionResult<ScannerSessionResponse>> StartSessionByPin(ScannerSessionByPinRequest request)
    {
        var result = await _scanSessions.ExchangePinOnlyAsync(request.Pin);
        if (result is null) return Unauthorized("Invalid, already-used, or expired PIN.");

        var (session, scanToken) = result.Value;
        var theme = await _themes.GetAsync(session.ServerId);
        return new ScannerSessionResponse(scanToken, session.ScanTokenExpiresAt!.Value, theme);
    }

    // Anonymous, read-only PIN check - lets the marketing site's download widget (and the
    // download-scanner route itself) tell a player their PIN is wrong or expired before
    // anything downloads, instead of handing out the exe regardless and letting Scanner.exe
    // fail confusingly later. Never issues a token or touches the session's status.
    [HttpGet("pin-check")]
    [AllowAnonymous]
    public async Task<ActionResult<PinCheckResponse>> CheckPin([FromQuery] string? pin)
    {
        if (pin is null || !System.Text.RegularExpressions.Regex.IsMatch(pin, @"^\d{6}$"))
            return new PinCheckResponse(false);

        return new PinCheckResponse(await _scanSessions.IsPinValidAsync(pin));
    }

    [HttpPost("heartbeat")]
    [Authorize(AuthenticationSchemes = ScannerTokenAuthenticationOptions.SchemeName)]
    public async Task<IActionResult> Heartbeat()
    {
        await _scanSessions.RecordHeartbeatAsync(CurrentSession);
        return NoContent();
    }

    [HttpPost("results")]
    [Authorize(AuthenticationSchemes = ScannerTokenAuthenticationOptions.SchemeName)]
    public async Task<IActionResult> SubmitResult(ScannerResultRequest request)
    {
        if (!Enum.TryParse<ScanResultType>(request.ResultType, ignoreCase: true, out var type))
            return BadRequest($"Unknown ResultType '{request.ResultType}'.");

        if (string.IsNullOrWhiteSpace(request.DataJson))
            return BadRequest("DataJson is required.");

        try
        {
            await _scanSessions.AddResultAsync(CurrentSession, type, request.DataJson);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "22P05" })
        {
            // A source (most often an OS-provided string like a registry value) contained an
            // embedded NUL character - valid once JSON-escaped, but Postgres's jsonb parser
            // rejects it as untranslatable to text. Surface it as a normal 400 instead of
            // letting it fall through as an unhandled 500 - one flaky data source on the
            // player's machine shouldn't look like a server outage to them.
            return BadRequest($"{request.ResultType} result contains a character Postgres can't store (likely an embedded NUL byte from a corrupted source value).");
        }

        return NoContent();
    }

    // Phase 7: the scanner uploads a candidate file's raw bytes; YARA runs against them here
    // and the file is deleted immediately after - only the match results (if any) are kept,
    // as Detections, never the bytes themselves.
    [HttpPost("files")]
    [Authorize(AuthenticationSchemes = ScannerTokenAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<SubmitFileResponse>> SubmitFile(SubmitFileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName))
            return BadRequest("FileName is required.");

        byte[] content;
        try
        {
            content = Convert.FromBase64String(request.ContentBase64);
        }
        catch (FormatException)
        {
            return BadRequest("ContentBase64 is not valid base64.");
        }

        if (content.Length == 0) return BadRequest("File content is empty.");
        if (content.Length > MaxFileBytes) return BadRequest($"File exceeds the {MaxFileBytes / 1024 / 1024}MB limit.");

        var tempPath = Path.GetTempFileName();
        try
        {
            await System.IO.File.WriteAllBytesAsync(tempPath, content);
            var matches = _yara.ScanFile(tempPath);

            await _detectionEngine.RecordYaraDetectionsAsync(CurrentSession.Id, request.FileName, matches);
            await _scanSessions.MarkInProgressAsync(CurrentSession);

            return new SubmitFileResponse(matches.Count, matches.Select(m => m.RuleId).ToList());
        }
        finally
        {
            System.IO.File.Delete(tempPath);
        }
    }

    // Phase 5: the scanner no longer gets a say in its own risk score. The Detection Engine
    // evaluates every raw result already stored for this session against the server's own
    // rules and that's what gets persisted - see DetectionEngine.EvaluateAsync.
    //
    // Phase 8: the Detection rows (not raw scanner output) also get turned into a short
    // human-readable assessment - best-effort, never blocks completion if it fails.
    [HttpPost("complete")]
    [Authorize(AuthenticationSchemes = ScannerTokenAuthenticationOptions.SchemeName)]
    public async Task<ActionResult<ScannerCompleteResponse>> Complete()
    {
        var (riskScore, detections) = await _detectionEngine.EvaluateAsync(CurrentSession.Id);
        var summary = await _aiSummary.SummarizeAsync(CurrentSession.PlayerIdentifier, riskScore, detections);
        await EnrichSteamIdentityAsync();
        await _scanSessions.CompleteAsync(CurrentSession, riskScore, summary);
        return new ScannerCompleteResponse(riskScore, detections.Count);
    }

    // Identity enrichment, not a detection - deliberately kept out of IDetectionEngine, same
    // reasoning that already keeps IAiSummaryService a separate step here. Best-effort: a
    // failed/skipped lookup (no Steam Web API key configured, Steam wasn't running, the
    // profile is private) never blocks scan completion - CompleteAsync's own SaveChangesAsync
    // persists whatever gets set here alongside its own fields.
    private async Task EnrichSteamIdentityAsync()
    {
        var result = await _scanSessions.GetLatestResultAsync(CurrentSession.Id, ScanResultType.Steam);
        if (result is null) return;

        var facts = Deserialize<SteamFact>(result.DataJson);
        var steamId64 = facts.FirstOrDefault()?.SteamId64;
        if (string.IsNullOrWhiteSpace(steamId64)) return;

        CurrentSession.SteamId64 = steamId64;

        var profile = await _steamProfiles.GetProfileAsync(steamId64);
        CurrentSession.SteamUsername = profile.Username;
        CurrentSession.SteamAvatarUrl = profile.AvatarUrl;
    }

    private static List<T> Deserialize<T>(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<T>>(json, JsonOptions) ?? new List<T>();
        }
        catch (JsonException)
        {
            return new List<T>();
        }
    }

    private record SteamFact(string SteamId64);

    private ScanSession CurrentSession => (ScanSession)HttpContext.Items["ScanSession"]!;
}
