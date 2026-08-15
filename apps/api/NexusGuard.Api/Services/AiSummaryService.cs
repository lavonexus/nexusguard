using System.Text;
using Anthropic;
using Anthropic.Models.Messages;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public class AiSummaryService : IAiSummaryService
{
    private readonly AnthropicClient? _client;
    private readonly ILogger<AiSummaryService> _logger;

    public AiSummaryService(IConfiguration config, ILogger<AiSummaryService> logger)
    {
        _logger = logger;

        var apiKey = config["Anthropic:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Anthropic:ApiKey is not configured - AI summaries are disabled.");
            _client = null;
            return;
        }

        _client = new AnthropicClient { ApiKey = apiKey };
    }

    public async Task<string?> SummarizeAsync(
        string playerIdentifier, int riskScore, List<Detection> detections, CancellationToken ct = default)
    {
        if (_client is null) return null;

        var prompt = BuildPrompt(playerIdentifier, riskScore, detections);

        try
        {
            var response = await _client.Messages.Create(new MessageCreateParams
            {
                Model = "claude-opus-5",
                MaxTokens = 512,
                OutputConfig = new OutputConfig { Effort = Effort.Low },
                Messages = [new() { Role = Role.User, Content = prompt }],
            });

            var text = response.Content
                .Select(b => b.Value)
                .OfType<TextBlock>()
                .FirstOrDefault()?.Text;

            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }
        catch (Exception ex)
        {
            // Never let a summary failure break scan completion - the risk score and
            // Detections are already authoritative without it.
            _logger.LogWarning(ex, "AI summary generation failed for scan by {Player}", playerIdentifier);
            return null;
        }
    }

    private static string BuildPrompt(string playerIdentifier, int riskScore, List<Detection> detections)
    {
        var sb = new StringBuilder();
        sb.AppendLine(
            $"A FiveM anti-cheat scan for player '{playerIdentifier}' completed with risk score {riskScore}/100.");

        if (detections.Count == 0)
        {
            sb.AppendLine("No rules matched - the scan came back clean.");
        }
        else
        {
            sb.AppendLine("Detections from the server-side rule engine (these are the server's own findings, " +
                "not anything the scanner claimed about itself):");
            foreach (var d in detections.OrderByDescending(d => d.Weight))
            {
                sb.AppendLine($"- {d.Description} (weight {d.Weight}, evidence: {d.Evidence})");
            }
        }

        sb.AppendLine();
        sb.AppendLine(
            "Write a 2-4 sentence risk assessment for a server admin deciding whether to act on this scan. " +
            "Be concrete about what was found and how serious it is. Do not invent findings beyond what's " +
            "listed above, and do not recommend a specific punishment - just characterize the risk.");

        return sb.ToString();
    }
}
