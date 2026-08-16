namespace NexusGuard.Api.Models;

// One rating/comment per (ListingId, ReviewerUserId) - resubmitting updates the existing row
// rather than creating a second one. Published immediately, no approval gate (see
// MarketplaceListing's own comment on why).
public class MarketplaceReview
{
    public Guid Id { get; set; }

    public Guid ListingId { get; set; }
    public MarketplaceListing? Listing { get; set; }

    public Guid ReviewerUserId { get; set; }
    public User? Reviewer { get; set; }

    public int Rating { get; set; }
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
