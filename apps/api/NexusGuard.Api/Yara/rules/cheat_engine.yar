rule Cheat_Engine_Binary
{
    meta:
        description = "Strings characteristic of the Cheat Engine memory scanner/debugger"
        weight = 40

    // Deliberately no bare "dbvm" string here - Cheat Engine's DBVM driver name is only 4
    // characters, short enough to turn up as a coincidental substring inside unrelated binary
    // data. Confirmed as a real false-positive source: it fired on AnyDesk.exe, VencordInstaller.exe,
    // and Content Manager.exe in an actual scan, none of which have anything to do with Cheat
    // Engine. The remaining strings are specific enough (a full product name, or the driver's
    // actual filename) to not need it.
    strings:
        $name1 = "Cheat Engine" ascii wide
        $name2 = "CHEATENGINE" ascii wide nocase
        $driver = "dbk64.sys" ascii wide nocase

    condition:
        any of them
}
