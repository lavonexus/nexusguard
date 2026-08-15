using dnYara;

namespace NexusGuard.Api.Services;

// Loads every .yar file under Yara/rules once at startup and keeps the compiled rules (and
// the native YaraContext they depend on) alive for the process lifetime - compiling is the
// expensive part, scanning a single file against already-compiled rules is cheap.
//
// Rule weight/description live here, not read from YARA meta fields, so a rule addition
// requires touching both the .yar file and RuleInfo below - keep them in sync.
public class YaraScanEngine : IYaraScanEngine, IDisposable
{
    private static readonly Dictionary<string, (int Weight, string Description)> RuleInfo = new()
    {
        ["Cheat_Engine_Binary"] = (40, "Strings characteristic of the Cheat Engine memory scanner/debugger."),
        ["Known_Injector_Tool_Strings"] = (40, "Product/version strings from a well-known generic DLL injector tool."),
        ["FiveM_Cheat_Menu_Strings"] = (45, "Cheat-feature vocabulary co-occurring with FiveM/RAGE engine references."),
    };

    private readonly YaraContext _context;
    private readonly CompiledRules _rules;

    public YaraScanEngine(IWebHostEnvironment env)
    {
        _context = new YaraContext();

        var rulesDir = Path.Combine(AppContext.BaseDirectory, "Yara", "rules");
        var ruleFiles = Directory.Exists(rulesDir)
            ? Directory.GetFiles(rulesDir, "*.yar")
            : Array.Empty<string>();

        if (ruleFiles.Length == 0)
        {
            throw new InvalidOperationException(
                $"No YARA rule files found under {rulesDir} - check the .csproj CopyToOutputDirectory setting.");
        }

        using var compiler = new Compiler();
        foreach (var file in ruleFiles)
        {
            compiler.AddRuleFile(file);
        }

        _rules = compiler.Compile();
    }

    public List<YaraMatch> ScanFile(string filePath)
    {
        var scanner = new Scanner();
        var results = scanner.ScanFile(filePath, _rules);

        var matches = new List<YaraMatch>();
        foreach (var result in results)
        {
            var ruleId = result.MatchingRule.Identifier;
            var (weight, description) = RuleInfo.TryGetValue(ruleId, out var info)
                ? info
                : (10, "Unrecognized rule (no weight configured).");

            matches.Add(new YaraMatch(ruleId, weight, description));
        }

        return matches;
    }

    public void Dispose()
    {
        _rules.Dispose();
        _context.Dispose();
    }
}
