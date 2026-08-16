namespace NexusGuard.Api.Models;

// A Tool Designer theme published from a SavedToolDesign for every NexusGuard user to browse
// and install - deliberately theme-only (colors/text/logo/watermark), never a place to share
// detection logic (that would break the rule that scoring is server-side-only and never
// trusts external input, same reasoning behind CheatSignatureDatabase/DetectionEngine).
// ThemeJson is copied at publish time, independent of the SavedToolDesign it came from, so the
// author editing their library entry later doesn't retroactively change what's already public.
// No approval gate - goes live immediately (a deliberate choice, see AdminController's
// listing/review delete endpoints for the reactive safety net instead).
public class MarketplaceListing
{
    public Guid Id { get; set; }

    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ThemeJson { get; set; } = string.Empty;

    public int InstallCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MarketplaceReview> Reviews { get; set; } = new List<MarketplaceReview>();
}
