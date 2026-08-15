rule FiveM_Cheat_Menu_Strings
{
    meta:
        description = "Cheat-feature vocabulary (aimbot/ESP/wallhack) co-occurring with FiveM/RAGE engine references"
        weight = 45

    strings:
        // "noclip" and generic UI-overlay words are deliberately excluded - they show up
        // in legitimate FiveM/RAGE engine binaries (debug camera, dev UI) and produced real
        // false positives against the game's own official DLLs during testing.
        $feature1 = "aimbot" ascii wide nocase
        $feature2 = "wallhack" ascii wide nocase
        $feature3 = "silent aim" ascii wide nocase
        $feature4 = "triggerbot" ascii wide nocase

        $context1 = "FiveM" ascii wide
        $context2 = "RAGE Engine" ascii wide nocase
        $context3 = "CitizenFX" ascii wide

    condition:
        any of ($feature*) and any of ($context*)
}
