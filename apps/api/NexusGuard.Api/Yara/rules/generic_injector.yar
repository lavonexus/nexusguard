// A generic "VirtualAllocEx + WriteProcessMemory + CreateRemoteThread + OpenProcess"
// import-co-occurrence rule lived here and was removed: real testing against this machine
// caught it matching RGL-ElevationHelper.exe, a standard, legitimate component of the
// Rockstar Games Launcher - which every real FiveM player has installed. Without
// Authenticode signature verification or a publisher allowlist, that class of heuristic
// would false-flag a large share of genuine players on exactly the game this tool targets,
// which is worse than missing a real injector. Revisit once code-signing checks exist.

rule Known_Injector_Tool_Strings
{
    meta:
        description = "Product/version strings from well-known generic DLL injector tools"
        weight = 40

    strings:
        $s1 = "Extreme Injector" ascii wide nocase
        $s2 = "Xenos Injector" ascii wide nocase
        $s3 = "Process Hacker" ascii wide nocase

    condition:
        any of them
}
