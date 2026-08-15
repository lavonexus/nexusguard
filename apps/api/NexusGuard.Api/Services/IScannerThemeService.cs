using NexusGuard.Api.DTOs;

namespace NexusGuard.Api.Services;

public interface IScannerThemeService
{
    Task<ScannerThemeResponse> GetAsync(Guid serverId, CancellationToken ct = default);

    Task<ScannerThemeResponse> UpdateAsync(Guid serverId, UpdateScannerThemeRequest request, CancellationToken ct = default);
}
