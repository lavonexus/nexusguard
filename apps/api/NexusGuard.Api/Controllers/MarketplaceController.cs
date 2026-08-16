using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Controllers;

// Tool Designer theme sharing: a private per-user library of saved designs (SavedToolDesign),
// and a public marketplace anyone can browse/review/install (MarketplaceListing). Deliberately
// theme-only (colors/text/logo/watermark) - never a place to share detection logic, which
// would break the rule that scoring is server-side-only and never trusts external input.
// User-identity scoped (session cookie), not server-API-key scoped - browsing/publishing isn't
// about any one server.
[ApiController]
[Route("api/marketplace")]
[Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
public class MarketplaceController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly NexusGuardDbContext _db;

    public MarketplaceController(NexusGuardDbContext db) => _db = db;

    // --- Personal library -------------------------------------------------------------

    [HttpGet("designs")]
    public async Task<ActionResult<List<SavedToolDesignResponse>>> ListDesigns()
    {
        var userId = CallerUserId();
        var designs = await _db.SavedToolDesigns
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return designs.Select(ToSavedDesignResponse).ToList();
    }

    [HttpPost("designs")]
    public async Task<ActionResult<SavedToolDesignResponse>> SaveDesign(SaveToolDesignRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var design = new SavedToolDesign
        {
            Id = Guid.NewGuid(),
            UserId = CallerUserId(),
            Name = request.Name.Trim(),
            ThemeJson = JsonSerializer.Serialize(request.Theme, JsonOptions),
            CreatedAt = DateTime.UtcNow,
        };

        _db.SavedToolDesigns.Add(design);
        await _db.SaveChangesAsync();

        return ToSavedDesignResponse(design);
    }

    [HttpDelete("designs/{id:guid}")]
    public async Task<IActionResult> DeleteDesign(Guid id)
    {
        var design = await _db.SavedToolDesigns.FindAsync(id);
        if (design is null) return NotFound();
        if (design.UserId != CallerUserId()) return Forbid();

        _db.SavedToolDesigns.Remove(design);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // --- Publishing --------------------------------------------------------------------

    // Publishes a copy of a saved design's current theme - the listing is independent from
    // here on, so the author editing their library entry later never retroactively changes
    // what's already public.
    [HttpPost("designs/{id:guid}/publish")]
    public async Task<ActionResult<MarketplaceListingSummaryResponse>> Publish(Guid id, PublishListingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required.");

        var design = await _db.SavedToolDesigns.FindAsync(id);
        if (design is null) return NotFound();
        if (design.UserId != CallerUserId()) return Forbid();

        var listing = new MarketplaceListing
        {
            Id = Guid.NewGuid(),
            AuthorUserId = CallerUserId(),
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            ThemeJson = design.ThemeJson,
            InstallCount = 0,
            CreatedAt = DateTime.UtcNow,
        };

        _db.MarketplaceListings.Add(listing);
        await _db.SaveChangesAsync();

        var author = await _db.Users.FindAsync(listing.AuthorUserId);
        return ToSummaryResponse(listing, author?.Username ?? "(bilinmiyor)", 0, 0);
    }

    // --- Browsing ------------------------------------------------------------------------

    [HttpGet("listings")]
    public async Task<ActionResult<List<MarketplaceListingSummaryResponse>>> ListListings([FromQuery] string? query)
    {
        var listings = _db.MarketplaceListings.Include(l => l.Author).Include(l => l.Reviews).AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLower();
            listings = listings.Where(l =>
                l.Title.ToLower().Contains(q) ||
                (l.Author != null && l.Author.Username.ToLower().Contains(q)));
        }

        var list = await listings.OrderByDescending(l => l.CreatedAt).Take(200).ToListAsync();

        return list.Select(l => ToSummaryResponse(
            l, l.Author?.Username ?? "(bilinmiyor)", l.Reviews.Count == 0 ? 0 : l.Reviews.Average(r => r.Rating), l.Reviews.Count)).ToList();
    }

    [HttpGet("listings/{id:guid}")]
    public async Task<ActionResult<MarketplaceListingDetailResponse>> GetListing(Guid id)
    {
        var listing = await _db.MarketplaceListings
            .Include(l => l.Author)
            .Include(l => l.Reviews).ThenInclude(r => r.Reviewer)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (listing is null) return NotFound();

        var avgRating = listing.Reviews.Count == 0 ? 0 : listing.Reviews.Average(r => r.Rating);
        var summary = ToSummaryResponse(listing, listing.Author?.Username ?? "(bilinmiyor)", avgRating, listing.Reviews.Count);

        var reviews = listing.Reviews
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new MarketplaceReviewResponse(
                r.Id, r.Reviewer?.Username ?? "(bilinmiyor)", r.Rating, r.Comment, r.CreatedAt))
            .ToList();

        var theme = Deserialize(listing.ThemeJson);
        return new MarketplaceListingDetailResponse(summary, theme, reviews);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<List<MarketplaceListingSummaryResponse>>> ListMine()
    {
        var userId = CallerUserId();
        var listings = await _db.MarketplaceListings
            .Include(l => l.Author)
            .Include(l => l.Reviews)
            .Where(l => l.AuthorUserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return listings.Select(l => ToSummaryResponse(
            l, l.Author?.Username ?? "(bilinmiyor)", l.Reviews.Count == 0 ? 0 : l.Reviews.Average(r => r.Rating), l.Reviews.Count)).ToList();
    }

    // --- Reviews ---------------------------------------------------------------------------

    // Upsert - resubmitting updates the caller's existing review on this listing instead of
    // creating a second one (see the unique (ListingId, ReviewerUserId) index).
    [HttpPost("listings/{id:guid}/reviews")]
    public async Task<ActionResult<MarketplaceReviewResponse>> SubmitReview(Guid id, SubmitReviewRequest request)
    {
        if (request.Rating is < 1 or > 5)
            return BadRequest("Rating must be between 1 and 5.");

        var listing = await _db.MarketplaceListings.FindAsync(id);
        if (listing is null) return NotFound();

        var userId = CallerUserId();
        var review = await _db.MarketplaceReviews
            .FirstOrDefaultAsync(r => r.ListingId == id && r.ReviewerUserId == userId);

        if (review is null)
        {
            review = new MarketplaceReview
            {
                Id = Guid.NewGuid(),
                ListingId = id,
                ReviewerUserId = userId,
                CreatedAt = DateTime.UtcNow,
            };
            _db.MarketplaceReviews.Add(review);
        }

        review.Rating = request.Rating;
        review.Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();

        await _db.SaveChangesAsync();

        var reviewer = await _db.Users.FindAsync(userId);
        return new MarketplaceReviewResponse(review.Id, reviewer?.Username ?? "(bilinmiyor)", review.Rating, review.Comment, review.CreatedAt);
    }

    // --- Install -------------------------------------------------------------------------

    // Applies a listing's theme onto the caller's own server - same 402 gate as Tool
    // Designer's own save (ServersController.UpdateTheme), same ownership check as
    // ServersController.CallerCanAccessServerAsync (owner or team member).
    [HttpPost("listings/{id:guid}/install")]
    public async Task<ActionResult<ScannerThemeResponse>> Install(Guid id, InstallListingRequest request)
    {
        var listing = await _db.MarketplaceListings.FindAsync(id);
        if (listing is null) return NotFound();

        var server = await _db.Servers.FindAsync(request.ServerId);
        if (server is null) return NotFound();
        if (!await CallerCanAccessServerAsync(server)) return Forbid();

        if (server.EffectivePlan == "Free")
            return StatusCode(StatusCodes.Status402PaymentRequired,
                "Mağazadan tasarım yüklemek için Free planın yeterli değil - PRO ya da üstü bir plana geçmen gerekiyor.");

        var theme = Deserialize(listing.ThemeJson);

        var serverTheme = await _db.ServerThemes.FirstOrDefaultAsync(t => t.ServerId == server.Id);
        if (serverTheme is null)
        {
            serverTheme = new ServerTheme { ServerId = server.Id };
            _db.ServerThemes.Add(serverTheme);
        }

        serverTheme.PrimaryTextColor = theme.PrimaryTextColor;
        serverTheme.SecondaryTextColor = theme.SecondaryTextColor;
        serverTheme.BackgroundColor = theme.BackgroundColor;
        serverTheme.SurfaceColor = theme.SurfaceColor;
        serverTheme.TitleBarColor = theme.TitleBarColor;
        serverTheme.AccentColor = theme.AccentColor;
        serverTheme.ProgressColor = theme.ProgressColor;
        serverTheme.PinTitle = theme.PinTitle;
        serverTheme.PinSubtitle = theme.PinSubtitle;
        serverTheme.StageEarlyText = theme.StageEarlyText;
        serverTheme.StageScanningText = theme.StageScanningText;
        serverTheme.StageDeepText = theme.StageDeepText;
        serverTheme.StageDetectionText = theme.StageDetectionText;
        serverTheme.CompletedTitle = theme.CompletedTitle;
        serverTheme.CompletedSubtitle = theme.CompletedSubtitle;
        serverTheme.LogoBase64 = theme.LogoBase64;
        serverTheme.ShowWatermark = theme.ShowWatermark;

        listing.InstallCount += 1;

        await _db.SaveChangesAsync();

        return theme;
    }

    private Guid CallerUserId() =>
        Guid.Parse(User.FindFirst(DashboardSessionClaimTypes.UserId)!.Value);

    private async Task<bool> CallerCanAccessServerAsync(Server server)
    {
        var userId = CallerUserId();
        if (server.OwnerUserId == userId) return true;

        return await _db.ServerMembers.AnyAsync(m => m.ServerId == server.Id && m.UserId == userId);
    }

    private static ScannerThemeResponse Deserialize(string themeJson) =>
        JsonSerializer.Deserialize<ScannerThemeResponse>(themeJson, JsonOptions)!;

    private static SavedToolDesignResponse ToSavedDesignResponse(SavedToolDesign design) =>
        new(design.Id, design.Name, Deserialize(design.ThemeJson), design.CreatedAt);

    private static MarketplaceListingSummaryResponse ToSummaryResponse(
        MarketplaceListing listing, string authorUsername, double averageRating, int reviewCount)
    {
        var theme = Deserialize(listing.ThemeJson);
        return new MarketplaceListingSummaryResponse(
            listing.Id, listing.Title, listing.Description, authorUsername, listing.InstallCount,
            Math.Round(averageRating, 1), reviewCount, listing.CreatedAt,
            theme.AccentColor, theme.BackgroundColor, theme.SurfaceColor, theme.LogoBase64);
    }
}
