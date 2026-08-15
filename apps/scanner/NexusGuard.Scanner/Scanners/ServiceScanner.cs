using Microsoft.Win32;
using System.ServiceProcess;

namespace NexusGuard.Scanner.Scanners;

// Every installed Windows service backed by a .exe/.sys binary. ServiceController gives the
// live name/display-name/status; the binary path isn't exposed there, so it's read from each
// service's own registry key (HKLM\SYSTEM\CurrentControlSet\Services\<name>\ImagePath) - the
// same place the Service Control Manager itself reads it from.
public static class ServiceScanner
{
    public static List<ServiceFact> Scan()
    {
        var facts = new List<ServiceFact>();

        ServiceController[] services;
        try
        {
            services = ServiceController.GetServices();
        }
        catch
        {
            return facts;
        }

        foreach (var service in services)
        {
            using (service)
            {
                try
                {
                    var imagePath = GetImagePath(service.ServiceName);
                    if (imagePath is null) continue;
                    if (!LooksLikeExecutable(imagePath)) continue;

                    facts.Add(new ServiceFact(
                        service.ServiceName, service.DisplayName, service.Status.ToString(), imagePath));
                }
                catch
                {
                    // A service can vanish or become inaccessible between enumeration and
                    // inspection - skip it rather than fail the whole pass.
                }
            }
        }

        return facts;
    }

    private static bool LooksLikeExecutable(string imagePath) =>
        imagePath.Contains(".exe", StringComparison.OrdinalIgnoreCase) ||
        imagePath.Contains(".sys", StringComparison.OrdinalIgnoreCase);

    private static string? GetImagePath(string serviceName)
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(
                $@"SYSTEM\CurrentControlSet\Services\{serviceName}");
            return key?.GetValue("ImagePath") as string;
        }
        catch
        {
            return null;
        }
    }
}
