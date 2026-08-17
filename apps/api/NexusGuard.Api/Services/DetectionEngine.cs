using System.IO;
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

    // DLL-proxying (dropping a file named after a real Windows system DLL so the game loads it
    // automatically, which then forwards calls through to the real one) is exactly how
    // legitimate graphics/overlay tools like ReShade and ENB Series install themselves - not
    // just how a cheat would. Flagging every DLL in FiveM's plugins folder without exception
    // was wrong for the same reason the client-side scanner already avoids flagging dinput8.dll/
    // dsound.dll/ScriptHook* by name alone: confirmed on a real install where dxgi.dll turned
    // out to be crosire's actual, digitally-signed ReShade64.dll (FileDescription: "crosire's
    // ReShade post-processing injector"), not a cheat. This is a name-only allowlist for the
    // same reason the rest of this file is name-only for detections - it doesn't verify
    // signature/publisher before excusing a name, because the point isn't "is this DLL good",
    // it's "is this specific filename too common in legitimate installs to be evidence on its
    // own" - same as never flagging dinput8.dll/dsound.dll as a cheat by name alone.
    private static readonly HashSet<string> KnownGraphicsProxyDllNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "dxgi.dll", "d3d9.dll", "d3d10.dll", "d3d11.dll", "d3d12.dll",
        "dinput8.dll", "dsound.dll", "opengl32.dll", "winmm.dll", "version.dll",
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
                ScanResultType.FileEvidence => EvaluateFileEvidence(scanSessionId, result.DataJson),
                ScanResultType.Autostart => EvaluateAutostart(scanSessionId, result.DataJson),
                ScanResultType.ScheduledTask => EvaluateScheduledTasks(scanSessionId, result.DataJson),
                ScanResultType.Service => EvaluateServices(scanSessionId, result.DataJson),
                ScanResultType.InstalledApplication => EvaluateInstalledApplications(scanSessionId, result.DataJson),
                _ => Enumerable.Empty<Detection>(),
            });
        }

        // Whether FiveM was actually running feeds the correlation pass below - a suspicious
        // DLL sitting next to a cheat-signature match means much more when the game session
        // that would use them was live, versus stale leftovers from months ago.
        var systemResult = results.FirstOrDefault(r => r.ResultType == ScanResultType.System);
        var fiveMRunning = systemResult is not null &&
            Deserialize<SystemFact>(systemResult.DataJson).FirstOrDefault()?.FiveMProcessFound == true;
        ApplyCorrelationBoost(detections, fiveMRunning);

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
            NewDetection(scanSessionId, $"yara:{m.RuleId}", m.Weight, m.Description, fileName,
                category: "CHEAT", confidence: "High"));

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

            // A name-fragment match alone is weak by design (never convict on filename alone -
            // see EvaluateFileEvidence's identical reasoning). ProcessScanner already captures
            // Sha256/Signed/Publisher for every process; this used to be collected and then
            // discarded here. A validly signed binary with a real publisher matching a tool-name
            // fragment (a legitimate app that happens to contain "injector"/"reclass"/etc. in its
            // name) stays at the weaker default instead of being treated the same as an unsigned
            // one - same unsigned-bump pattern EvaluateFileEvidence already uses, not a new idiom.
            var confidence = "Low";
            if (!fact.Signed || string.IsNullOrWhiteSpace(fact.Publisher))
                confidence = BumpConfidence(confidence);

            detections.Add(NewDetection(sessionId, "known-tool-process", 30,
                $"Process '{fact.Name}' (pid {fact.Pid}) matches known tool signature '{match}'.",
                fact.Name, category: "SUSPICIOUS PROCESS", confidence: confidence,
                sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed));
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
                fact.Path, category: "SUSPICIOUS DLL", confidence: "High"));
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
                $"File '{fact.Name}' matches known tool signature '{match}'.", fact.Path,
                category: "SUSPICIOUS APPLICATION", confidence: "Low"));
        }
        return detections;
    }

    private static List<Detection> EvaluateFiveMArtifacts(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<FiveMArtifactFact>(dataJson))
        {
            // Same hash-match-first ordering as EvaluateFileEvidence, now that this fact type
            // actually carries a hash - a known-bad sample dropped straight into FiveM's own
            // install root would otherwise only ever be caught by the weaker keyword/extension
            // checks below, which a simple rename defeats.
            if (fact.Sha256 is not null &&
                CheatSignatureDatabase.KnownBadFileHashes.TryGetValue(fact.Sha256, out var knownBad))
            {
                detections.Add(NewDetection(sessionId, $"known-hash:{knownBad.Category.ToLowerInvariant()}", 60,
                    $"Dosya '{fact.Name}' bilinen kötü amaçlı örnek '{knownBad.Name}' ile SHA256 eşleşmesi gösteriyor.",
                    fact.Path, category: knownBad.Category, confidence: "Confirmed",
                    sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed));
                continue;
            }

            if (fact.InPluginsDir && !KnownGraphicsProxyDllNames.Contains(fact.Name))
            {
                var pluginConfidence = fact.Signed ? "Medium" : BumpConfidence("Medium");
                detections.Add(NewDetection(sessionId, "fivem-plugin-dll", 25,
                    $"DLL '{fact.Name}' present in FiveM's plugins folder - loads directly into the client.",
                    fact.Path, category: "SUSPICIOUS DLL", confidence: pluginConfidence,
                    sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed));
                continue;
            }

            // .asi is the classic GTA V/FiveM auto-load mechanism (a dinput8.dll-style proxy
            // loads every .asi sitting next to the game executable, unconditionally, on every
            // launch, before FiveM's own sandboxed Lua resource system even starts) - unlike an
            // arbitrary .exe sitting on disk, an .asi here is guaranteed to run, so it earns a
            // baseline flag on its own rather than needing a keyword match first. Still only
            // Low/Medium - legitimate GTA V mods (trainers, graphics tweaks) use this exact
            // mechanism too, so this is context, not an accusation.
            if (!fact.InPluginsDir && Path.GetExtension(fact.Name).Equals(".asi", StringComparison.OrdinalIgnoreCase))
            {
                var confidence = fact.Signed ? "Low" : BumpConfidence("Low");
                detections.Add(NewDetection(sessionId, "fivem-autoload-asi", 20,
                    $"'.asi' dosyası '{fact.Name}' FiveM'in kök dizininde - her başlatmada oyun sürecine otomatik yükleniyor.",
                    fact.Path, category: "SUSPICIOUS APPLICATION", confidence: confidence,
                    sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed));
                continue;
            }

            var match = FiveMKeywords.FirstOrDefault(k =>
                fact.Name.Contains(k, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
            {
                detections.Add(NewDetection(sessionId, "fivem-suspicious-keyword", 25,
                    $"File '{fact.Name}' under FiveM's data directory contains suspicious keyword '{match}'.",
                    fact.Path, category: "CHEAT", confidence: "Low"));
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
                    $"Illegal RPF Detected : {fact.Name} ({description})", fact.Path,
                    category: "CHEAT", confidence: "High"));
                continue;
            }

            // Filename didn't match the known-bad list - fall back to what's actually packed
            // inside the archive. fact.Entries is the RPF's own internal name list, read by the
            // scanner's RpfInspector, not anything the scanner infers or judges itself.
            var haystack = string.Join(" ", new[] { fact.Name }.Concat(fact.Entries ?? new List<string>()));
            var contentMatch = RpfContentSignatures.FirstOrDefault(s => s.Pattern.IsMatch(haystack));
            if (contentMatch.Pattern is null) continue;

            detections.Add(NewDetection(sessionId, "suspicious-rpf-content", 25,
                $"Suspicious RPF Content : {fact.Name} ({contentMatch.Label})", fact.Path,
                category: "CHEAT", confidence: "Medium"));
        }
        return detections;
    }

    private static Detection NewDetection(
        Guid sessionId, string ruleId, int weight, string description, string evidence,
        string category = "OTHER", string status = "Active", string confidence = "Medium",
        string? sha256 = null, string? publisher = null, bool? signed = null,
        DateTime? firstSeenUtc = null, DateTime? lastModifiedUtc = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            ScanSessionId = sessionId,
            RuleId = ruleId,
            Weight = weight,
            Description = description,
            Evidence = evidence,
            Category = category,
            Status = status,
            Confidence = confidence,
            Sha256 = sha256,
            Publisher = publisher,
            Signed = signed,
            FirstSeenUtc = firstSeenUtc,
            LastModifiedUtc = lastModifiedUtc,
            CreatedAt = DateTime.UtcNow,
        };

    // --- Broad file-evidence sweep (Downloads/AppData/Temp/FiveM/GTAV/...) - previously
    // collected and shown informationally but never scored. Runs every fact through
    // CheatSignatureDatabase plus two generic, name-independent checks: an unsigned kernel
    // driver, and a Lua file whose own name suggests it's an executor/injector rather than an
    // ordinary FiveM resource script (a normal install has thousands of harmless .lua files,
    // so "any .lua file" would be pure noise - see CheatSignatureDatabase.SuspiciousLuaKeywords).
    private static List<Detection> EvaluateFileEvidence(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<FileEvidenceFact>(dataJson))
        {
            var ext = Path.GetExtension(fact.Name).ToLowerInvariant();

            // An exact hash match against a real, hash-identified sample - the only detection
            // in this engine allowed straight to "Confirmed" with no correlation needed, since
            // renaming or moving the file can't change what it actually is. Checked first, ahead
            // of every extension-specific branch below, so a known-bad Lua script (say) still
            // gets caught by its hash even after being renamed past the keyword check further
            // down - a name-only check on its own would never catch that rename.
            if (fact.Sha256 is not null &&
                CheatSignatureDatabase.KnownBadFileHashes.TryGetValue(fact.Sha256, out var knownBad))
            {
                detections.Add(NewDetection(
                    sessionId, $"known-hash:{knownBad.Category.ToLowerInvariant()}", 60,
                    $"Dosya '{fact.Name}' bilinen kötü amaçlı örnek '{knownBad.Name}' ile SHA256 eşleşmesi gösteriyor.",
                    fact.Path, category: knownBad.Category, status: "Active", confidence: "Confirmed",
                    sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed,
                    firstSeenUtc: fact.CreatedUtc, lastModifiedUtc: fact.ModifiedUtc));
                continue;
            }

            if (ext is ".lua" or ".luac")
            {
                var nameLower = fact.Name.ToLowerInvariant();
                var keyword = CheatSignatureDatabase.SuspiciousLuaKeywords.FirstOrDefault(k => nameLower.Contains(k));
                if (keyword is null) continue; // an ordinary resource script, never a detection alone

                detections.Add(NewDetection(
                    sessionId, "lua-artifact", 10,
                    $"Lua dosyası '{fact.Name}' şüpheli anahtar kelime içeriyor: '{keyword}'. Bu tek başına kesin bir hile kanıtı değildir.",
                    fact.Path, category: "LUA", status: "Active", confidence: "Low",
                    sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed,
                    firstSeenUtc: fact.CreatedUtc, lastModifiedUtc: fact.ModifiedUtc));
                continue;
            }

            if (ext == ".sys" && !fact.Signed)
            {
                detections.Add(NewDetection(
                    sessionId, "unsigned-driver", 15,
                    $"İmzasız çekirdek sürücüsü bulundu: '{fact.Name}'.", fact.Path,
                    category: "SUSPICIOUS DRIVER", status: "Active", confidence: "Low",
                    sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed,
                    firstSeenUtc: fact.CreatedUtc, lastModifiedUtc: fact.ModifiedUtc));
                continue;
            }

            var sig = CheatSignatureDatabase.Match(fact.Name) ?? CheatSignatureDatabase.Match(fact.Path);
            if (sig is null)
            {
                // No name/hash match, but a real GTA V install's own root folder is the one
                // place a dinput8.dll-style ASI loader picks up every .asi and runs it
                // unconditionally on the next launch - see FiveMArtifactScanner's identical
                // .asi handling for FiveM's own install root. Still Low - legitimate GTA V mods
                // (trainers, graphics tweaks) use this exact same mechanism.
                if (ext == ".asi" && fact.Category == "GTAV-Root")
                {
                    var asiConfidence = fact.Signed ? "Low" : BumpConfidence("Low");
                    detections.Add(NewDetection(
                        sessionId, "gtav-autoload-asi", 20,
                        $"'.asi' dosyası '{fact.Name}' GTA V kurulum dizininde - her başlatmada oyun sürecine otomatik yükleniyor.",
                        fact.Path, category: "SUSPICIOUS APPLICATION", status: "Active", confidence: asiConfidence,
                        sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed,
                        firstSeenUtc: fact.CreatedUtc, lastModifiedUtc: fact.ModifiedUtc));
                }
                continue;
            }

            // A name match alone is weak by design (see CheatSignatureDatabase) - an unsigned
            // binary that also matches a suspicious name pattern is meaningfully stronger,
            // since almost all legitimate software in these categories ships signed.
            var confidence = sig.BaseConfidence;
            if (!fact.Signed && sig.Category is "INJECTOR" or "LOADER" or "MAPPER" or "CHEAT")
                confidence = BumpConfidence(confidence);

            detections.Add(NewDetection(
                sessionId, $"file-evidence:{sig.Category.ToLowerInvariant()}", sig.BaseWeight,
                $"Dosya '{fact.Name}' ({fact.Category} klasöründe) bilinen imza '{sig.Name}' ile eşleşiyor.",
                fact.Path, category: sig.Category, status: "Active", confidence: confidence,
                sha256: fact.Sha256, publisher: fact.Publisher, signed: fact.Signed,
                firstSeenUtc: fact.CreatedUtc, lastModifiedUtc: fact.ModifiedUtc));
        }
        return detections;
    }

    // Startup entries, scheduled tasks, and services were already collected (and shown
    // informationally) but never scored either - same signature database, low starting
    // confidence since a registry command-line match is a weaker signal than an actual file on
    // disk with hash/signature evidence.
    private static List<Detection> EvaluateAutostart(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<AutostartFact>(dataJson))
        {
            var sig = CheatSignatureDatabase.Match(fact.Command) ?? CheatSignatureDatabase.Match(fact.Name);
            if (sig is null) continue;

            detections.Add(NewDetection(
                sessionId, $"autostart:{sig.Category.ToLowerInvariant()}", Math.Max(10, sig.BaseWeight / 2),
                $"Başlangıçta çalışan '{fact.Name}' bilinen imza '{sig.Name}' ile eşleşiyor ({fact.Source}).",
                fact.Command, category: sig.Category, status: "Active", confidence: "Low"));
        }
        return detections;
    }

    private static List<Detection> EvaluateScheduledTasks(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<ScheduledTaskFact>(dataJson))
        {
            var sig = CheatSignatureDatabase.Match(fact.Command) ?? CheatSignatureDatabase.Match(fact.TaskName);
            if (sig is null) continue;

            detections.Add(NewDetection(
                sessionId, $"scheduled-task:{sig.Category.ToLowerInvariant()}", Math.Max(10, sig.BaseWeight / 2),
                $"Zamanlanmış görev '{fact.TaskName}' bilinen imza '{sig.Name}' ile eşleşiyor.",
                fact.Command, category: sig.Category, status: fact.Enabled ? "Active" : "Unknown", confidence: "Low"));
        }
        return detections;
    }

    private static List<Detection> EvaluateServices(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<ServiceFact>(dataJson))
        {
            var haystack = $"{fact.Name} {fact.DisplayName} {fact.BinaryPath}";
            var sig = CheatSignatureDatabase.Match(haystack);
            if (sig is null) continue;

            var isRunning = string.Equals(fact.Status, "Running", StringComparison.OrdinalIgnoreCase);
            detections.Add(NewDetection(
                sessionId, $"service:{sig.Category.ToLowerInvariant()}", Math.Max(10, sig.BaseWeight / 2),
                $"Servis '{fact.DisplayName}' bilinen imza '{sig.Name}' ile eşleşiyor (durum: {fact.Status}).",
                fact.BinaryPath ?? fact.Name, category: sig.Category,
                status: isRunning ? "Active" : "Unknown", confidence: "Low"));
        }
        return detections;
    }

    // Installed-application (Uninstall registry key) history - the one place a program that's
    // since been deleted can still leave real, safely-readable evidence behind. Matches
    // section 5/6 of the spec: a lingering uninstall record with no executable on disk is
    // reported as a Historical/Removed artifact, never as proof of an actively running cheat.
    private static List<Detection> EvaluateInstalledApplications(Guid sessionId, string dataJson)
    {
        var detections = new List<Detection>();
        foreach (var fact in Deserialize<InstalledApplicationFact>(dataJson))
        {
            var sig = CheatSignatureDatabase.Match(fact.DisplayName)
                ?? (fact.Publisher is not null ? CheatSignatureDatabase.Match(fact.Publisher) : null);
            if (sig is null) continue;

            var status = fact.ExecutablePathExists ? "Active" : "Removed";
            // A lingering uninstall record is still a real historical fact even when it can't
            // be raised past Medium from a name match alone.
            var confidence = fact.ExecutablePathExists ? sig.BaseConfidence : "Medium";
            var weight = fact.ExecutablePathExists ? sig.BaseWeight : Math.Max(5, sig.BaseWeight / 3);
            var description = fact.ExecutablePathExists
                ? $"Yüklü uygulama '{fact.DisplayName}' bilinen imza '{sig.Name}' ile eşleşiyor."
                : $"Historical Detection: '{fact.DisplayName}' daha önce yüklenmiş (kayıt hâlâ mevcut, çalıştırılabilir dosya artık bulunamadı) - bilinen imza: '{sig.Name}'.";

            detections.Add(NewDetection(
                sessionId, $"installed-app:{sig.Category.ToLowerInvariant()}", weight, description,
                fact.InstallLocation ?? fact.UninstallString ?? fact.DisplayName,
                category: fact.ExecutablePathExists ? sig.Category : "HISTORICAL ARTIFACT",
                status: status, confidence: confidence,
                publisher: fact.Publisher, firstSeenUtc: fact.InstallDate));
        }
        return detections;
    }

    // Runs after every fact type has been evaluated, over the whole in-memory batch - two
    // independent scanners agreeing (a Lua artifact next to a suspicious binary in the same
    // folder, or several different suspicious categories firing while FiveM was actually
    // running) is real corroborating evidence a single hit isn't. Never raises anything to
    // Confirmed - only an exact known-bad hash match earns that, never mere co-occurrence, and
    // never lets a single file alone reach it either.
    private static void ApplyCorrelationBoost(List<Detection> detections, bool fiveMRunning)
    {
        var luaDetections = detections.Where(d => d.Category == "LUA").ToList();
        var otherSuspicious = detections.Where(d => d.Category != "LUA").ToList();
        foreach (var lua in luaDetections)
        {
            var luaDir = SafeGetDirectory(lua.Evidence);
            if (luaDir is null) continue;
            if (otherSuspicious.Any(o => SafeGetDirectory(o.Evidence) == luaDir))
            {
                lua.Confidence = BumpConfidence(lua.Confidence);
                lua.Description += " Aynı klasörde başka bir şüpheli dosya da bulundu - güven seviyesi bu nedenle yükseltildi.";
            }
        }

        if (!fiveMRunning) return;

        var suspiciousCategories = new HashSet<string> { "CHEAT", "INJECTOR", "LOADER", "MAPPER", "SUSPICIOUS DLL", "SUSPICIOUS DRIVER" };
        var distinctCategoriesPresent = detections
            .Select(d => d.Category)
            .Where(suspiciousCategories.Contains)
            .Distinct()
            .Count();
        if (distinctCategoriesPresent < 2) return;

        foreach (var d in detections.Where(d => suspiciousCategories.Contains(d.Category)))
        {
            d.Confidence = BumpConfidence(d.Confidence);
        }
    }

    private static string? SafeGetDirectory(string path)
    {
        try { return Path.GetDirectoryName(path); } catch { return null; }
    }

    private static string BumpConfidence(string current) => current switch
    {
        "Low" => "Medium",
        "Medium" => "High",
        _ => current, // High/Confirmed never move via a name match or correlation alone
    };

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

    // Wire shapes the scanner submits - raw facts only, no opinion fields. ProcessFact mirrors
    // only the fields this engine actually reads; ProcessScanner also sends Path/ParentProcessName,
    // which JSON deserialization simply ignores here.
    private record ProcessFact(string Name, int Pid, string? Sha256, bool Signed, string? Publisher);
    private record ModuleFact(string Name, string Path, bool UnderGameDir, bool UnderSystemDir);
    private record FileFact(string Name, string Path);
    private record FiveMArtifactFact(
        string Name, string Path, bool InPluginsDir, string? Sha256, bool Signed, string? Publisher);
    private record RpfFact(string Name, string Path, long SizeBytes, string Sha256, List<string>? Entries);
    private record FileEvidenceFact(
        string Name, string Path, string Category, long SizeBytes, string? Sha256,
        bool Signed, string? Publisher, DateTime? CreatedUtc, DateTime? ModifiedUtc);
    private record AutostartFact(string Name, string Command, string Source);
    private record ScheduledTaskFact(string TaskName, string Command, bool Enabled);
    private record ServiceFact(string Name, string DisplayName, string Status, string? BinaryPath);
    private record InstalledApplicationFact(
        string DisplayName, string? Publisher, string? DisplayVersion, string? InstallLocation,
        DateTime? InstallDate, string? UninstallString, bool ExecutablePathExists);
    private record SystemFact(
        string OsVersion, string MachineName, bool FiveMProcessFound,
        DateTime? WindowsInstallDate, string? RegionCountry);
}
