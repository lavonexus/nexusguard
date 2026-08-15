namespace NexusGuard.Api.Services;

// A single named signature: what category of tool it is, what name/path fragments identify
// it, and what confidence/weight a name-only match starts at. This is a starter set, in the
// same spirit as the YARA rule files and IllegalRpfNames - illustrative real-world categories
// and a few named examples (Machocheats among them, per the original request), not a licensed
// threat-intel feed. Extending it means adding a row here; nothing else in DetectionEngine
// needs to change to pick up a new signature.
//
// Deliberately NOT hash-based here - Patterns match a lowercased filename/path/display-name.
// A name match alone is why every signature here caps out at "Low" or "Medium" confidence
// (see BaseConfidence) - DetectionEngine only ever raises that when a name match is paired
// with something the scanner can't fake by renaming a file: a known-bad hash, an unsigned
// binary outside its expected directory, or another independent signal firing on the same
// scan (see EvaluateAsync's correlation pass).
public record CheatSignature(
    string Name,
    string Category,
    string[] Patterns,
    int BaseWeight,
    string BaseConfidence);

public static class CheatSignatureDatabase
{
    public static readonly CheatSignature[] Signatures =
    {
        // --- Named, specific tools -------------------------------------------------------
        new("Machocheats", "CHEAT",
            new[] { "machocheat", "macho cheat", "macho-cheat" }, 40, "Medium"),

        // --- Generic FiveM/GTA cheat clients ----------------------------------------------
        new("FiveM Cheat Client", "CHEAT",
            new[] { "fivemcheat", "fivem cheat", "fivem-cheat", "fivem_cheat", "ragecheat", "rage cheat", "gtavcheat", "gta cheat" },
            35, "Low"),
        new("Overlay-Based Cheat (ESP/Aimbot)", "CHEAT",
            new[] { "espoverlay", "esp overlay", "esp-overlay", "aimbot", "wallhack", "wall hack" },
            35, "Low"),
        new("Memory Manipulation Tool", "CHEAT",
            new[] { "cheatengine", "cheat engine", "cheat-engine", "memoryeditor", "memory editor", "artmoney" },
            35, "Medium"),

        // --- Injectors -----------------------------------------------------------------
        new("DLL/Process Injector", "INJECTOR",
            new[] { "dllinjector", "dll injector", "dll-injector", "dll_injector", "processinjector",
                     "process injector", "extreme injector", "xenos injector", "injector.exe" },
            30, "Low"),
        new("Internal Cheat Loader", "INJECTOR",
            new[] { "internal cheat", "internalcheat", "internal loader", "internalloader" },
            30, "Low"),

        // --- Loaders / mappers ------------------------------------------------------------
        new("External Cheat Loader", "LOADER",
            new[] { "cheatloader", "cheat loader", "cheat-loader", "external loader", "externalloader" },
            25, "Low"),
        new("Manual-Map Tool", "MAPPER",
            new[] { "manualmap", "manual-map", "manual_map", "manual map", "kdmapper" },
            25, "Low"),

        // --- Lua executors/injectors (paired with .lua/.luac evidence, see EvaluateLuaFiles) ---
        new("Lua Executor/Injector", "LUA",
            new[] { "luaexecutor", "lua executor", "lua-executor", "lua_executor",
                     "luainjector", "lua injector", "lua-injector", "lua_injector" },
            25, "Low"),

        // --- FiveM/GTA-specific trace/cache cleaners (never generic Windows cleaners) ------
        new("FiveM/GTA Trace Cleaner", "CLEANER",
            new[] { "fivemcleaner", "fivem cleaner", "fivem-cleaner", "gtacleaner", "gta cleaner",
                     "fivem trace", "gta trace", "fivem cache cleaner", "gta cache cleaner" },
            20, "Low"),
    };

    // Matches a lowercased haystack (filename, path, or display name) against every pattern in
    // every signature and returns the first hit - callers pass whatever text is relevant to
    // the fact type they're evaluating (a process name, a file path, an installed app's
    // display name).
    public static CheatSignature? Match(string haystack)
    {
        if (string.IsNullOrWhiteSpace(haystack)) return null;
        var lower = haystack.ToLowerInvariant();
        foreach (var sig in Signatures)
        {
            foreach (var pattern in sig.Patterns)
            {
                if (lower.Contains(pattern, StringComparison.Ordinal)) return sig;
            }
        }
        return null;
    }

    // The keyword subset that makes a .lua/.luac file worth surfacing at all - see the big
    // comment on EvaluateLuaFiles for why plain "any .lua file" would be far too noisy (a
    // normal FiveM install legitimately has thousands of them). Deliberately excludes
    // "loader" and "hook" - both show up constantly in FiveM's own official runtime script
    // names (e.g. citizen/scripting/lua/natives_loader.lua), confirmed by an actual scan on a
    // real install flagging that exact file before this list was narrowed.
    public static readonly string[] SuspiciousLuaKeywords =
        { "exec", "inject", "bypass", "cheat", "spoof" };

    // Real, hash-identified samples - the "obvious next step" the DetectionEngine comment on
    // IllegalRpfNames calls out (a cheat can trivially rename a file to dodge every check above,
    // but not change its own bytes without becoming a different sample). This is the only place
    // in the whole engine allowed to earn "Confirmed" confidence on its own, with no correlation
    // or second signal required - see DetectionEngine.ApplyCorrelationBoost's comment on why
    // nothing else may reach it.
    public static readonly Dictionary<string, (string Name, string Category)> KnownBadFileHashes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // FiveM "Silence" cracked cheat DLL (ImGui/DX11 overlay, vehicle-lock features),
            // downloaded via a Discord CDN attachment link, found on the user's own Desktop as
            // "Silence_Cracked.dll" and hash-verified on 2026-08-16. Static string analysis
            // found no ransomware/stealer payload, but confirmed it's an unsigned, stripped
            // game-cheat overlay - not something a legitimate install would ever ship.
            ["8F7D38A91B7FB31FE66321F88F30CAB45136BC2B94232E1E0AC8848D097F1F88"] =
                ("Silence (Cracked FiveM Cheat)", "CHEAT"),
        };
}
