namespace NexusGuard.Api.Services;

public record YaraMatch(string RuleId, int Weight, string Description);

public interface IYaraScanEngine
{
    /// Runs every compiled rule against a file on disk and returns the ones that matched.
    /// Called on a file the scanner just uploaded - the caller is responsible for deleting
    /// it once this returns, matched or not.
    List<YaraMatch> ScanFile(string filePath);
}
