rule Cheat_Engine_Binary
{
    meta:
        description = "Strings characteristic of the Cheat Engine memory scanner/debugger"
        weight = 40

    strings:
        $name1 = "Cheat Engine" ascii wide
        $name2 = "CHEATENGINE" ascii wide nocase
        $driver = "dbk64.sys" ascii wide nocase
        $driver2 = "dbvm" ascii wide nocase

    condition:
        any of them
}
