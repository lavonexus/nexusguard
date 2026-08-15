using System.Runtime.InteropServices;
using Microsoft.Win32;
using Microsoft.Win32.SafeHandles;

namespace NexusGuard.Scanner.Scanners;

// Windows keeps a record of every USB mass-storage device ever connected under
// HKLM\SYSTEM\CurrentControlSet\Enum\USBSTOR, even after the device is unplugged - a
// standard forensic source, not something NexusGuard invented. Purely informational: shown
// to the admin, never scored, since almost every PC has USB history for unrelated reasons.
public static class UsbHistoryScanner
{
    private const string UsbStorKey = @"SYSTEM\CurrentControlSet\Enum\USBSTOR";

    public static List<UsbDeviceFact> Scan()
    {
        var facts = new List<UsbDeviceFact>();

        try
        {
            using var usbStor = Registry.LocalMachine.OpenSubKey(UsbStorKey);
            if (usbStor is null) return facts;

            // One subkey per device type/model (e.g. "Disk&Ven_SanDisk&Prod_Cruzer&Rev_1.00"),
            // each containing one subkey per unique serial number actually plugged in.
            foreach (var deviceTypeName in usbStor.GetSubKeyNames())
            {
                using var deviceType = usbStor.OpenSubKey(deviceTypeName);
                if (deviceType is null) continue;

                foreach (var serialName in deviceType.GetSubKeyNames())
                {
                    using var instance = deviceType.OpenSubKey(serialName);
                    if (instance is null) continue;

                    var friendlyName = instance.GetValue("FriendlyName") as string
                        ?? instance.GetValue("DeviceDesc") as string
                        ?? deviceTypeName;

                    facts.Add(new UsbDeviceFact(friendlyName, $"{deviceTypeName}\\{serialName}", GetLastWriteTimeUtc(instance)));
                }
            }
        }
        catch
        {
            // No admin rights or the key is locked down - absence isn't suspicious, just skip.
        }

        return facts;
    }

    // RegistryKey exposes no managed "last write time" property - the registry itself tracks
    // one per key (updated whenever a value under it changes, which is exactly what happens
    // when a device is plugged in again), so this reads it via the same Win32 call every
    // native registry-forensics tool uses.
    private static DateTime? GetLastWriteTimeUtc(RegistryKey key)
    {
        try
        {
            var result = RegQueryInfoKey(
                key.Handle, null, IntPtr.Zero, IntPtr.Zero, out _, out _, out _, out _, out _, out _, out _,
                out var lastWriteTime);
            if (result != 0) return null;

            var fileTime = ((long)lastWriteTime.dwHighDateTime << 32) | (uint)lastWriteTime.dwLowDateTime;
            return DateTime.FromFileTimeUtc(fileTime);
        }
        catch
        {
            return null;
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILETIME
    {
        public int dwLowDateTime;
        public int dwHighDateTime;
    }

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern int RegQueryInfoKey(
        SafeRegistryHandle hKey, System.Text.StringBuilder? lpClass, IntPtr lpcchClass, IntPtr lpReserved,
        out int lpcSubKeys, out int lpcbMaxSubKeyLen, out int lpcbMaxClassLen,
        out int lpcValues, out int lpcbMaxValueNameLen, out int lpcbMaxValueLen,
        out int lpcbSecurityDescriptor, out FILETIME lpftLastWriteTime);
}
