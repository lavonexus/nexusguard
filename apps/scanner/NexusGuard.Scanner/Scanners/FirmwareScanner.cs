using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace NexusGuard.Scanner.Scanners;

// Read-only, best-effort UEFI/Secure Boot/TPM/firmware-boot-entry facts - see FirmwareFact's
// own comment for why this deliberately stops short of verifying the firmware image itself.
// Every source here is either a registry read, a WMI query, or shelling out to bcdedit's own
// read-only /enum - nothing writes, nothing needs elevation beyond what the scanner already
// runs as, and every step is wrapped so one missing/blocked source doesn't null out the rest.
public static class FirmwareScanner
{
    public static FirmwareFact Scan()
    {
        var (isUefi, secureBoot) = ReadSecureBootState();
        var (tpmPresent, tpmEnabled, tpmActivated, tpmSpec) = ReadTpmState();
        var bootEntries = ReadFirmwareBootEntries();
        var testSigning = ReadTestSigningState();

        return new FirmwareFact(isUefi, secureBoot, tpmPresent, tpmEnabled, tpmActivated, tpmSpec, bootEntries, testSigning);
    }

    // The SecureBoot\State key only exists at all on a UEFI system (Legacy BIOS has no such
    // concept) - its mere presence is the best user-mode signal of UEFI vs Legacy available
    // without calling into the native firmware-type APIs.
    private static (bool IsUefi, bool? SecureBootEnabled) ReadSecureBootState()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\SecureBoot\State");
            if (key is null) return (false, null);

            var enabled = key.GetValue("UEFISecureBootEnabled");
            return (true, enabled is int i ? i == 1 : null);
        }
        catch
        {
            return (false, null);
        }
    }

    private static (bool? Present, bool? Enabled, bool? Activated, string? SpecVersion) ReadTpmState()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(
                @"root\CIMV2\Security\MicrosoftTpm",
                "SELECT IsEnabled_InitialValue, IsActivated_InitialValue, SpecVersion FROM Win32_Tpm");
            using var results = searcher.Get();

            foreach (ManagementObject mo in results)
            {
                using (mo)
                {
                    var enabled = mo["IsEnabled_InitialValue"] as bool?;
                    var activated = mo["IsActivated_InitialValue"] as bool?;
                    var spec = mo["SpecVersion"] as string;
                    return (true, enabled, activated, spec);
                }
            }

            return (false, null, null, null); // query succeeded but returned no Win32_Tpm instance - no TPM
        }
        catch
        {
            // Namespace/class not present (older Windows, TPM support disabled at the driver
            // level) - "unknown", not "no TPM", since we couldn't actually check.
            return (null, null, null, null);
        }
    }

    // bcdedit /enum firmware lists the firmware boot menu's own entries - read-only, no
    // /set or /create involved anywhere here. Parsed loosely (each entry is a blank-line-
    // separated block of "field    value" lines) since the exact field set varies by
    // Windows version and locale.
    private static List<FirmwareBootEntry> ReadFirmwareBootEntries()
    {
        var entries = new List<FirmwareBootEntry>();
        try
        {
            var psi = new ProcessStartInfo("bcdedit.exe", "/enum firmware")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var process = Process.Start(psi);
            if (process is null) return entries;

            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit(5000);

            foreach (var block in Regex.Split(output, @"\r?\n\r?\n"))
            {
                var identifier = Regex.Match(block, @"^identifier\s+(\S+)", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                if (!identifier.Success) continue;

                var description = Regex.Match(block, @"^description\s+(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                var path = Regex.Match(block, @"^path\s+(\S+)", RegexOptions.Multiline | RegexOptions.IgnoreCase);

                entries.Add(new FirmwareBootEntry(
                    identifier.Groups[1].Value.Trim(),
                    description.Success ? description.Groups[1].Value.Trim() : null,
                    path.Success ? path.Groups[1].Value.Trim() : null));
            }
        }
        catch
        {
            // bcdedit missing/blocked (rare, some locked-down images) - just report nothing.
        }

        return entries;
    }

    // bcdedit /enum {current} (the actual boot-loader entry, unlike /enum firmware above)
    // needs admin rights to open the BCD store - confirmed empirically ("access denied" from a
    // normal user token) - so Test Signing state is read the way tools like System Informer do
    // instead: a direct NtQuerySystemInformation(SystemCodeIntegrityInformation) call, which is
    // readable from any user-mode process. CODEINTEGRITY_OPTION_TESTSIGN (bit 0x2) is the flag
    // Windows itself uses internally to decide whether to allow an unsigned kernel driver to
    // load - confirmed against this machine's own known-off state (struct size echoed back
    // correctly, TESTSIGN bit correctly 0).
    private const int SystemCodeIntegrityInformation = 103;
    private const uint CodeIntegrityOptionTestSign = 0x02;

    [StructLayout(LayoutKind.Sequential)]
    private struct SYSTEM_CODEINTEGRITY_INFORMATION
    {
        public uint Length;
        public uint CodeIntegrityOptions;
    }

    [DllImport("ntdll.dll")]
    private static extern int NtQuerySystemInformation(
        int systemInformationClass, IntPtr systemInformation, int systemInformationLength, out int returnLength);

    private static bool? ReadTestSigningState()
    {
        var size = Marshal.SizeOf<SYSTEM_CODEINTEGRITY_INFORMATION>();
        var buffer = IntPtr.Zero;
        try
        {
            buffer = Marshal.AllocHGlobal(size);
            Marshal.StructureToPtr(new SYSTEM_CODEINTEGRITY_INFORMATION { Length = (uint)size }, buffer, false);

            var status = NtQuerySystemInformation(SystemCodeIntegrityInformation, buffer, size, out _);
            if (status != 0) return null;

            var info = Marshal.PtrToStructure<SYSTEM_CODEINTEGRITY_INFORMATION>(buffer);
            return (info.CodeIntegrityOptions & CodeIntegrityOptionTestSign) != 0;
        }
        catch
        {
            return null;
        }
        finally
        {
            if (buffer != IntPtr.Zero) Marshal.FreeHGlobal(buffer);
        }
    }
}
