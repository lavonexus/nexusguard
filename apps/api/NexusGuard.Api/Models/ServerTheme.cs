namespace NexusGuard.Api.Models;

// Per-server customization of what the player sees when they run Scanner.exe - colors,
// stage messages, an optional custom logo, and a watermark toggle. One row per server (no
// saved-preset library, unlike some competitors' "my designs" gallery - a deliberate scope
// cut). Purely cosmetic: nothing here ever reaches the Detection Engine or affects scoring.
public class ServerTheme
{
    public Guid ServerId { get; set; }
    public Server? Server { get; set; }

    public string PrimaryTextColor { get; set; } = "#F5F3FF";
    public string SecondaryTextColor { get; set; } = "#A497C7";
    public string BackgroundColor { get; set; } = "#0A0714";
    public string SurfaceColor { get; set; } = "#1B1330";
    public string TitleBarColor { get; set; } = "#0A0714";
    public string AccentColor { get; set; } = "#8B5CF6";
    public string ProgressColor { get; set; } = "#8B5CF6";

    public string PinTitle { get; set; } = "Enter a PIN";
    public string PinSubtitle { get; set; } = "Get this from whoever asked you to run a scan.";

    // Blank means "use the scanner's own real step-by-step status text" - these only override
    // that when the admin has actually written something, so an un-customized server still
    // shows honest, specific progress instead of an empty label.
    public string StageEarlyText { get; set; } = "";
    public string StageScanningText { get; set; } = "";
    public string StageDeepText { get; set; } = "";
    public string StageDetectionText { get; set; } = "";

    public string CompletedTitle { get; set; } = "Scan complete";
    public string CompletedSubtitle { get; set; } =
        "Thanks - the results have been sent to the server admin. You can close this window.";

    // Data URL (e.g. "data:image/png;base64,...") - capped client-side at 2MB, same limit the
    // dashboard's upload UI enforces. Null means "use NexusGuard's own shield mark".
    public string? LogoBase64 { get; set; }

    public bool ShowWatermark { get; set; } = true;
}
