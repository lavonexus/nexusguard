namespace NexusGuard.Api.DTOs;

public record SavedToolDesignResponse(Guid Id, string Name, ScannerThemeResponse Theme, DateTime CreatedAt);

public record SaveToolDesignRequest(string Name, ScannerThemeResponse Theme);

public record PublishListingRequest(string Title, string? Description);

// Enough for a Keşfet grid card: identity, a couple of aggregate stats, and a handful of
// theme fields for a small color-swatch preview - not the full theme (see the Detail response
// for that), so the browse list stays light.
public record MarketplaceListingSummaryResponse(
    Guid Id,
    string Title,
    string? Description,
    string AuthorUsername,
    int InstallCount,
    double AverageRating,
    int ReviewCount,
    DateTime CreatedAt,
    string AccentColor,
    string BackgroundColor,
    string SurfaceColor,
    string? LogoBase64);

public record MarketplaceListingDetailResponse(
    MarketplaceListingSummaryResponse Summary,
    ScannerThemeResponse Theme,
    List<MarketplaceReviewResponse> Reviews);

public record MarketplaceReviewResponse(
    Guid Id, string ReviewerUsername, int Rating, string? Comment, DateTime CreatedAt);

public record SubmitReviewRequest(int Rating, string? Comment);

public record InstallListingRequest(Guid ServerId);
