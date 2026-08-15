using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public interface IDetectionEngine
{
    /// Evaluates every raw ScanResult recorded for a session against the server's own rule
    /// set, persists the resulting Detections, and returns them with the risk score derived
    /// from their combined weight (capped at 100). Never reads anything the scanner itself
    /// claimed was suspicious.
    Task<(int RiskScore, List<Detection> Detections)> EvaluateAsync(Guid scanSessionId, CancellationToken ct = default);

    /// Persists YARA matches found in a single uploaded file as Detections. Unlike
    /// EvaluateAsync's rule set (which runs over everything at Complete() time), this is
    /// called immediately per file as the scanner uploads it - see ScannerController.SubmitFile.
    Task RecordYaraDetectionsAsync(
        Guid scanSessionId, string fileName, List<YaraMatch> matches, CancellationToken ct = default);
}
