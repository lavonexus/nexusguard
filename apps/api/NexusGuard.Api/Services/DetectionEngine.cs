using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Database;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

// Phase 5: the rule set lives here now, not in Scanner.exe. The scanner only ever reports
// raw facts (which processes are running, which DLLs are loaded and where from, which files
// exist) - this engine is the only thing that decides whether a fact is suspicious and how
// much it's worth. A compromised or rewritten scanner that stops flagging itself can't
// change that, because it was never the one making the call.
public class DetectionEngine : IDetectionEngine
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    // Same signatures ProcessScanner/FileSystemScanner used to check client-side in Phase 3 -
    // the difference is these now run on data the client can no longer curate.
    private static readonly string[] ProcessNameFragments =
    {
        "cheatengine", "cheat engine", "x64dbg", "x32dbg", "ollydbg", "ida64", "ida ",
        "extreme injector", "xenos", "injector", "artmoney", "processhacker",
        "reclass", "dnspy",
    };

    private static readonly string[] FileNameFragments =
    {
        "cheatengine", "cheat-engine", "cheat_engine", "x64dbg", "x32dbg", "ollydbg",
        "extreme-injector", "extreme_injector", "xenos", "injector", "artmoney",
    };

    private static readonly string[] FiveMKeywords =
    {
        "menu", "cheat", "bypass", "unlock", "spoofer", "inject",
    };

    // Starter list, same spirit as the YARA rules: illustrative known-bad RPF replacement
    // names an admin can extend, not a real external threat-intel feed. Matched by filename
    // only for now - a hash allowlist/denylist is the obvious next step once real samples are
    // collected, since a cheat can trivially rename the file to dodge a name-only check.
    private static readonly Dictionary<string, string> IllegalRpfNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["StaminaFall_Damage.rpf"] = "No Fall + No Stamina",
        ["NoRagdoll.rpf"] = "No Ragdoll",
        ["NoRecoil.rpf"] = "No Recoil",
        ["InfiniteAmmo.rpf"] = "Infinite Ammo",
        ["NoCollision.rpf"] = "No Collision",
    };

    // The dashboard's RPF content viewer (rpfContent.ts) reads an archive's own internal entry
    // names to describe what it likely contains - most of those descriptions (a texture pack, a
    // prop set) are completely mundane and must never be scored. This is the narrow subset that
    // isn't: these specific patterns only show up in known exploit/gameplay-modifier RPFs, not
    // in ordinary map/vehicle content, so a name-only rename (the reason IllegalRpfNames is
    // filename-limited) doesn't help a cheat dodge this - the archive's own contents still have
    // to reference the thing they modify. Weighted lower than an exact IllegalRpfNames hit
    // because it's a heuristic over content rather than a known-bad sample.
    private static readonly (Regex Pattern, string Label)[] RpfContentSignatures =
    {
        (new Regex("fast.?connect|vehiclelayouts", RegexOptions.IgnoreCase), "Fast Connect (araca hızlı giriş/çıkış)"),
        (new Regex("stamina|fall.?damage", RegexOptions.IgnoreCase), "Stamina / düşme hasarı değişikliği"),
        (new Regex("ragdoll", RegexOptions.IgnoreCase), "Ragdoll değişikliği"),
        (new Regex("recoil", RegexOptions.IgnoreCase), "Geri tepme (recoil) değişikliği"),
        (new Regex("infinite.?ammo|unlimited.?ammo", RegexOptions.IgnoreCase), "Sınırsız mühimmat"),
        (new Regex("no.?collision", RegexOptions.IgnoreCase), "Çarpışma (collision) değişikliği"),
    };

    private readonly NexusGuardDbContext _db;

    public DetectionEngine(NexusGuardDbContext db) => _db = db;

    public async Task<(int RiskScore, List<Detection> Detections)> EvaluateAsync(
        Guid scanSessionId, CancellationToken ct = default)
    {
        var results = await _db.ScanResults
            .Where(r => r.ScanSessionId == scanSessionId)
            .ToListAsync(ct);

        var detections = new List<Detection>();

        foreach (var result in results)
        {
            detections.AddRange(result.ResultType switch
            {
                ScanResultType.Process => EvaluateProcesses(scanSessionId, result.DataJson),
                ScanResultType.Module => EvaluateModules(scanSessionId, result.DataJson),
                ScanResultType.File => EvaluateFiles(scanSessionId, result.DataJson),
                ScanResultType.FiveMArtifact => EvaluateFiveMArtifacts(scanSessionId, result.DataJson),
                ScanResultType.Rpf => EvaluateRpfFiles(scanSessionId, result.DataJson),
                _ => Enumerable.Empty<Detection>(),
            });
        }

        _db.Detections.AddRange(detections);
        await _db.SaveChangesAsync(ct);

        // Includes detections already recorded before Complete() was called - e.g. YARA
        // matches from files the scanner uploaded mid-scan (see ScannerController.SubmitFile)
        // - not just the ones this pass just generated.
        var allDetections = await _db.Detections
            .Where(d => d.ScanSessionId == scanSessionId)
            .ToListAsync(ct);

        var riskScore = Math.Min(allDetections.Sum(d => d.Weight), 100);
        return (riskScore, allDetections);
    }

    public async Task RecordYaraDetectionsAsync(
        Guid scanSessionId, string fileName, List<YaraMatch> matches, CancellationToken ct = default)
    {
        if (matches.Count == 0) return;

        var detections = matches.Select(m =>
            NewDetection(scanSessionId, $"yara:{m.RuleId}", m.Weight, m.Description, fileName));

        _db.Detections.AddRange(detections);
        await _db.SaveChangesAsync(ct);
    }

    private static List<Detection> EvaluateProcesses(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<ProcessFact>(dataJson))
        {
            var match = ProcessNameFragments.FirstOrDefault(f =>
                fact.Name.Contains(f, StringComparison.OrdinalIgnoreCase));
            if (match is null) continue;

            detections.Add(NewDetection(sessionId, "known-tool-process", 30,
                $"Process '{fact.Name}' (pid {fact.Pid}) matches known tool signature '{match}'.",
                fact.Name));
        }
        return detections;
    }

    private static List<Detection> EvaluateModules(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<ModuleFact>(dataJson))
        {
            if (fact.UnderGameDir || fact.UnderSystemDir) continue;

            detections.Add(NewDetection(sessionId, "injected-module", 40,
                $"Module '{fact.Name}' loaded into the FiveM process from outside its install and system directories.",
                fact.Path));
        }
        return detections;
    }

    private static List<Detection> EvaluateFiles(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<FileFact>(dataJson))
        {
            var match = FileNameFragments.FirstOrDefault(f =>
                fact.Name.Contains(f, StringComparison.OrdinalIgnoreCase));
            if (match is null) continue;

            detections.Add(NewDetection(sessionId, "known-tool-file", 20,
                $"File '{fact.Name}' matches known tool signature '{match}'.", fact.Path));
        }
        return detections;
    }

    private static List<Detection> EvaluateFiveMArtifacts(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<FiveMArtifactFact>(dataJson))
        {
            if (fact.InPluginsDir)
            {
                detections.Add(NewDetection(sessionId, "fivem-plugin-dll", 25,
                    $"DLL '{fact.Name}' present in FiveM's plugins folder - loads directly into the client.",
                    fact.Path));
                continue;
            }

            var match = FiveMKeywords.FirstOrDefault(k =>
                fact.Name.Contains(k, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
            {
                detections.Add(NewDetection(sessionId, "fivem-suspicious-keyword", 25,
                    $"File '{fact.Name}' under FiveM's data directory contains suspicious keyword '{match}'.",
                    fact.Path));
            }
        }
        return detections;
    }

    private static List<Detection> EvaluateRpfFiles(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<RpfFact>(dataJson))
        {
            if (IllegalRpfNames.TryGetValue(fact.Name, out var description))
            {
                detections.Add(NewDetection(sessionId, "illegal-rpf", 45,
                    $"Illegal RPF Detected : {fact.Name} ({description})", fact.Path));
                continue;
            }

            // Filename didn't match the known-bad list - fall back to what's actually packed
            // inside the archive. fact.Entries is the RPF's own internal name list, read by the
            // scanner's RpfInspector, not anything the scanner infers or judges itself.
            var haystack = string.Join(" ", new[] { fact.Name }.Concat(fact.Entries ?? new List<string>()));
            var contentMatch = RpfContentSignatures.FirstOrDefault(s => s.Pattern.IsMatch(haystack));
            if (contentMatch.Pattern is null) continue;

            detections.Add(NewDetection(sessionId, "suspicious-rpf-content", 25,
                $"Suspicious RPF Content : {fact.Name} ({contentMatch.Label})", fact.Path));
        }
        return detections;
    }

    private static List<T> Deserialize<T>(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<T>>(json, JsonOptions) ?? new List<T>();
        }
        catch (JsonException)
        {
            return new List<T>();
        }
    }

    private static Detection NewDetection(Guid sessionId, string ruleId, int weight, string description, string evidence) =>
        new()
        {
            Id = Guid.NewGuid(),
            ScanSessionId = sessionId,
            RuleId = ruleId,
            Weight = weight,
            Description = description,
            Evidence = evidence,
            CreatedAt = DateTime.UtcNow,
        };

    // Wire shapes the scanner submits - raw facts only, no opinion fields.
    private record ProcessFact(string Name, int Pid);
    private record ModuleFact(string Name, string Path, bool UnderGameDir, bool UnderSystemDir);
    private record FileFact(string Name, string Path);
    private record FiveMArtifactFact(string Name, string Path, bool InPluginsDir);
    private record RpfFact(string Name, string Path, long SizeBytes, string Sha256, List<string>? Entries);
}
