using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public class ScannerThemeService : IScannerThemeService
{
    // ~2MB of image data becomes ~2.7MB once base64-encoded - matches the dashboard upload
    // widget's own stated limit, enforced again here since a client-side check is only ever
    // a courtesy, not a guarantee.
    private const int MaxLogoBase64Length = 3 * 1024 * 1024;
    private const int MaxLabelLength = 200;

    private readonly NexusGuardDbContext _db;

    public ScannerThemeService(NexusGuardDbContext db) => _db = db;

    public async Task<ScannerThemeResponse> GetAsync(Guid serverId, CancellationToken ct = default)
    {
        var theme = await _db.ServerThemes.FirstOrDefaultAsync(t => t.ServerId == serverId, ct);
        return ToResponse(theme ?? new ServerTheme { ServerId = serverId });
    }

    public async Task<ScannerThemeResponse> UpdateAsync(
        Guid serverId, UpdateScannerThemeRequest request, CancellationToken ct = default)
    {
        if (request.LogoBase64 is { Length: > MaxLogoBase64Length })
            throw new ArgumentException("Logo is too large (max ~2MB).");

        var theme = await _db.ServerThemes.FirstOrDefaultAsync(t => t.ServerId == serverId, ct);
        if (theme is null)
        {
            theme = new ServerTheme { ServerId = serverId };
            _db.ServerThemes.Add(theme);
        }

        theme.PrimaryTextColor = NormalizeColor(request.PrimaryTextColor, theme.PrimaryTextColor);
        theme.SecondaryTextColor = NormalizeColor(request.SecondaryTextColor, theme.SecondaryTextColor);
        theme.BackgroundColor = NormalizeColor(request.BackgroundColor, theme.BackgroundColor);
        theme.SurfaceColor = NormalizeColor(request.SurfaceColor, theme.SurfaceColor);
        theme.TitleBarColor = NormalizeColor(request.TitleBarColor, theme.TitleBarColor);
        theme.AccentColor = NormalizeColor(request.AccentColor, theme.AccentColor);
        theme.ProgressColor = NormalizeColor(request.ProgressColor, theme.ProgressColor);

        theme.PinTitle = Truncate(request.PinTitle);
        theme.PinSubtitle = Truncate(request.PinSubtitle);
        theme.StageEarlyText = Truncate(request.StageEarlyText);
        theme.StageScanningText = Truncate(request.StageScanningText);
        theme.StageDeepText = Truncate(request.StageDeepText);
        theme.StageDetectionText = Truncate(request.StageDetectionText);
        theme.CompletedTitle = Truncate(request.CompletedTitle);
        theme.CompletedSubtitle = Truncate(request.CompletedSubtitle);

        theme.LogoBase64 = string.IsNullOrWhiteSpace(request.LogoBase64) ? null : request.LogoBase64;
        theme.ShowWatermark = request.ShowWatermark;

        await _db.SaveChangesAsync(ct);
        return ToResponse(theme);
    }

    private static string Truncate(string? value) =>
        string.IsNullOrEmpty(value) ? "" : value.Length > MaxLabelLength ? value[..MaxLabelLength] : value;

    private static string NormalizeColor(string? value, string fallback) =>
        !string.IsNullOrWhiteSpace(value) && System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9A-Fa-f]{6}$")
            ? value
            : fallback;

    private static ScannerThemeResponse ToResponse(ServerTheme t) => new(
        t.PrimaryTextColor, t.SecondaryTextColor, t.BackgroundColor, t.SurfaceColor,
        t.TitleBarColor, t.AccentColor, t.ProgressColor,
        t.PinTitle, t.PinSubtitle,
        t.StageEarlyText, t.StageScanningText, t.StageDeepText, t.StageDetectionText,
        t.CompletedTitle, t.CompletedSubtitle,
        t.LogoBase64, t.ShowWatermark);
}
