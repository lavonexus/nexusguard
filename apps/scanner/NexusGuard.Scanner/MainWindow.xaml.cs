using System.IO;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace NexusGuard.Scanner;

public partial class MainWindow : Window
{
    private readonly TextBox[] _pinBoxes;
    private readonly ApiClient _api;
    private CancellationTokenSource? _scanCts;
    private ScannerTheme? _theme;

    public MainWindow()
    {
        InitializeComponent();

        // The native title bar defaults to light chrome regardless of the app's own theme,
        // which reads as a jarring, unfinished seam against a dark window - ask DWM for the
        // dark variant instead of building a fully custom chrome just for this.
        SourceInitialized += (_, _) => UseDarkTitleBar();

        var apiUrl = CliOptions.Parse(Environment.GetCommandLineArgs()).ApiUrl ?? "http://localhost:5080";
        _api = new ApiClient(apiUrl);

        _pinBoxes = [Pin0, Pin1, Pin2, Pin3, Pin4, Pin5];
        for (var i = 0; i < _pinBoxes.Length; i++)
        {
            var index = i;
            _pinBoxes[i].PreviewTextInput += (_, e) => e.Handled = !e.Text.All(char.IsDigit);
            _pinBoxes[i].TextChanged += (_, _) => OnPinBoxChanged(index);
            _pinBoxes[i].PreviewKeyDown += (_, e) => OnPinBoxKeyDown(index, e);
            DataObject.AddPastingHandler(_pinBoxes[i], OnPinPaste);
        }

        Loaded += (_, _) => Pin0.Focus();
        Loaded += (_, _) => TryAutoFillPinFromFileName();
    }

    // Download links from the dashboard point at /api/download-scanner?pin=XXXXXX, which
    // renames the same exe to "NexusGuard.Scanner_XXXXXX.exe" on the way out. No binary
    // rewriting, no protocol handlers to register - just a filename the browser preserves
    // through the download, which we read back here. The player still has to double-click
    // the file themselves; this only saves them retyping the PIN once they have.
    private static readonly Regex PinInFileNameRegex = new(@"_(\d{6})(?: ?\(\d+\))?\.exe$", RegexOptions.IgnoreCase);

    private async void TryAutoFillPinFromFileName()
    {
        var exePath = Environment.ProcessPath;
        if (string.IsNullOrEmpty(exePath)) return;

        var match = PinInFileNameRegex.Match(Path.GetFileName(exePath));
        if (!match.Success) return;

        var digits = match.Groups[1].Value;
        for (var i = 0; i < _pinBoxes.Length; i++)
        {
            _pinBoxes[i].Text = digits[i].ToString();
            await Task.Delay(90);
        }

        await Task.Delay(300);
        if (ConnectButton.IsEnabled) ConnectButton_Click(this, new RoutedEventArgs());
    }

    private void OnPinBoxChanged(int index)
    {
        var box = _pinBoxes[index];
        if (box.Text.Length == 1 && index < _pinBoxes.Length - 1)
        {
            _pinBoxes[index + 1].Focus();
            _pinBoxes[index + 1].SelectAll();
        }

        ConnectButton.IsEnabled = _pinBoxes.All(b => b.Text.Length == 1);
        if (ConnectButton.IsEnabled) PinError.Visibility = Visibility.Collapsed;
    }

    private void OnPinBoxKeyDown(int index, KeyEventArgs e)
    {
        if (e.Key == Key.Back && _pinBoxes[index].Text.Length == 0 && index > 0)
        {
            _pinBoxes[index - 1].Focus();
            _pinBoxes[index - 1].SelectAll();
        }
        else if (e.Key == Key.Enter && ConnectButton.IsEnabled)
        {
            ConnectButton_Click(this, new RoutedEventArgs());
        }
    }

    private void OnPinPaste(object sender, DataObjectPastingEventArgs e)
    {
        if (!e.DataObject.GetDataPresent(DataFormats.Text)) return;
        var text = ((string)e.DataObject.GetData(DataFormats.Text)).Where(char.IsDigit).ToArray();
        if (text.Length == 0) return;

        e.CancelCommand();
        var startIndex = Array.IndexOf(_pinBoxes, sender);
        for (var i = 0; i < text.Length && startIndex + i < _pinBoxes.Length; i++)
        {
            _pinBoxes[startIndex + i].Text = text[i].ToString();
        }
    }

    private string CurrentPin => string.Concat(_pinBoxes.Select(b => b.Text));

    private async void ConnectButton_Click(object sender, RoutedEventArgs e)
    {
        ConnectButton.IsEnabled = false;
        PinError.Visibility = Visibility.Collapsed;

        SessionResponse session;
        try
        {
            session = await _api.ExchangeSessionByPinAsync(CurrentPin);
        }
        catch (Exception ex)
        {
            PinError.Text = ex.Message.Contains("401")
                ? "That PIN is invalid, already used, or expired. Ask for a new one."
                : $"Couldn't reach NexusGuard: {ex.Message}";
            PinError.Visibility = Visibility.Visible;
            ConnectButton.IsEnabled = true;
            return;
        }

        ApplyTheme(session.Theme);

        ShowPanel(ScanningPanel);
        _scanCts = new CancellationTokenSource();
        var progress = new Progress<ScanProgress>(p =>
        {
            ScanProgressBar.Value = p.Percent;
            PercentText.Text = $"{p.Percent}%";
            StatusText.Text = StageTextFor(p);
        });

        _ = RunHeartbeat(session.ScanToken, _scanCts.Token);

        try
        {
            // Result is intentionally unused beyond confirming success - the player being
            // scanned never sees their own risk score or detection count, only the admin's
            // dashboard does.
            await ScanRunner.RunAsync(_api, session.ScanToken, progress, _scanCts.Token);
            ShowPanel(DonePanel);
        }
        catch (Exception ex)
        {
            FailureText.Text = ex.Message;
            ShowPanel(FailedPanel);
        }
        finally
        {
            _scanCts.Cancel();
        }
    }

    private async Task RunHeartbeat(string scanToken, CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(15), ct);
                await _api.SendHeartbeatAsync(scanToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected once the scan finishes or fails.
        }
        catch
        {
            // A missed heartbeat isn't fatal - the scan token just expires a bit sooner.
        }
    }

    // Applies an admin's Tool Designer customization (colors, per-stage copy, logo, watermark)
    // to the already-loaded UI. Every brush in App.xaml is a DynamicResource specifically so
    // this can swap them live instead of needing a restart. Purely cosmetic - never touches
    // scoring, detections, or what data the scan actually collects.
    private void ApplyTheme(ScannerTheme theme)
    {
        _theme = theme;

        SetBrush("TextPrimaryBrush", theme.PrimaryTextColor);
        SetBrush("TextSecondaryBrush", theme.SecondaryTextColor);
        SetBrush("BgBrush", theme.BackgroundColor);
        SetBrush("PanelBrush", theme.SurfaceColor);
        SetBrush("AccentBrush", theme.AccentColor);
        SetBrush("AccentHoverBrush", theme.AccentColor);
        SetBrush("ProgressBrush", theme.ProgressColor);
        SetBrush("TitleBarBrush", theme.TitleBarColor);

        if (!string.IsNullOrWhiteSpace(theme.PinTitle)) PinTitleText.Text = theme.PinTitle;
        if (!string.IsNullOrWhiteSpace(theme.PinSubtitle)) PinSubtitleText.Text = theme.PinSubtitle;
        if (!string.IsNullOrWhiteSpace(theme.CompletedTitle)) DoneTitleText.Text = theme.CompletedTitle;
        if (!string.IsNullOrWhiteSpace(theme.CompletedSubtitle)) DoneSubtitleText.Text = theme.CompletedSubtitle;

        WatermarkText.Visibility = theme.ShowWatermark ? Visibility.Visible : Visibility.Collapsed;

        if (!string.IsNullOrEmpty(theme.LogoBase64))
        {
            try
            {
                var bytes = Convert.FromBase64String(theme.LogoBase64);
                var bitmap = new BitmapImage();
                using var stream = new MemoryStream(bytes);
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.StreamSource = stream;
                bitmap.EndInit();
                bitmap.Freeze();

                LogoImage.Source = bitmap;
                LogoImage.Visibility = Visibility.Visible;
                LogoVector.Visibility = Visibility.Collapsed;
            }
            catch
            {
                // Malformed/undecodable logo data - keep the default vector shield instead of
                // failing scan startup over a cosmetic asset.
            }
        }

        // Re-apply the dark title bar after DWM has a chance to see the new TitleBarColor -
        // DwmSetWindowAttribute only controls light/dark chrome, not an arbitrary color, so
        // this stays a no-op beyond the initial call; kept here in case future Windows builds
        // expose a real caption color attribute.
        UseDarkTitleBar();
    }

    private static void SetBrush(string resourceKey, string hex)
    {
        try
        {
            var color = (Color)ColorConverter.ConvertFromString(hex)!;
            Application.Current.Resources[resourceKey] = new SolidColorBrush(color);
        }
        catch
        {
            // Invalid hex from a stale/corrupt theme row - leave the default brush in place.
        }
    }

    // Maps the scan's real percent-complete into the admin's custom per-stage copy, falling
    // back to the scanner's own technical status text wherever a stage field is blank so an
    // admin who hasn't customized anything sees exactly the old, more informative behavior.
    private string StageTextFor(ScanProgress p)
    {
        if (_theme is null) return p.Status;

        string? custom = p.Percent switch
        {
            >= 100 => null,
            <= 15 => _theme.StageEarlyText,
            <= 45 => _theme.StageScanningText,
            <= 75 => _theme.StageDeepText,
            _ => _theme.StageDetectionText,
        };

        return string.IsNullOrWhiteSpace(custom) ? p.Status : custom;
    }

    private void RetryButton_Click(object sender, RoutedEventArgs e)
    {
        foreach (var box in _pinBoxes) box.Text = "";
        ShowPanel(PinPanel);
        Pin0.Focus();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e) => Close();

    private void ShowPanel(FrameworkElement panel)
    {
        foreach (var p in new FrameworkElement[] { PinPanel, ScanningPanel, DonePanel, FailedPanel })
            p.Visibility = p == panel ? Visibility.Visible : Visibility.Collapsed;
    }

    private const int DwmwaUseImmersiveDarkMode = 20; // Windows 10 20H1+ / Windows 11

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int pvAttribute, int cbAttribute);

    private void UseDarkTitleBar()
    {
        try
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            var darkMode = 1;
            DwmSetWindowAttribute(hwnd, DwmwaUseImmersiveDarkMode, ref darkMode, sizeof(int));
        }
        catch
        {
            // Older Windows build without this DWM attribute - the light title bar is a
            // cosmetic miss, not worth failing startup over.
        }
    }
}

// Only an optional --api override survives from the old CLI - everything else (scan ID, PIN)
// is now driven by the GUI itself, never typed as a command-line flag.
internal record CliOptions(string? ApiUrl)
{
    public static CliOptions Parse(string[] args)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (args[i] == "--api") return new CliOptions(args[i + 1]);
        }
        return new CliOptions((string?)null);
    }
}
