namespace NexusGuard.Api.DTOs;

// Global, cross-server "who scans the most" - not scoped to any one server/team. AvatarUrl and
// Provider always reflect whichever account the person most recently logged in with (Username/
// AvatarUrl are overwritten on every login, same as everywhere else in the dashboard) - a
// Discord login shows their Discord name/avatar, a Google login shows their Google one.
public record GlobalLeaderboardEntryResponse(
    Guid UserId, string Username, string? AvatarUrl, string? Provider, int ScanCount, int DetectionCount);
