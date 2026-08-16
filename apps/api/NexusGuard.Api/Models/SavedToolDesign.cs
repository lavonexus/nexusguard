namespace NexusGuard.Api.Models;

// A user's private Tool Designer library - a named snapshot of a theme they can re-apply to
// the live editor later, or publish to the marketplace (MarketplaceListing). ThemeJson is a
// serialized ScannerThemeResponse-shaped object, not individual columns like ServerTheme -
// this data is always read/written as one unit and never queried field-by-field.
public class SavedToolDesign
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Name { get; set; } = string.Empty;
    public string ThemeJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
