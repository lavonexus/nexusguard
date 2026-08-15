namespace NexusGuard.Api.DTOs;

public record CreateUserRequest(string Username, string? Email);

public record UserResponse(
    Guid Id,
    string Username,
    string? DisplayName,
    string? Email,
    DateTime CreatedAt,
    bool DiscordLinked,
    bool GoogleLinked,
    int ActiveSessionCount,
    bool IsSiteAdmin);

public record UpdateDisplayNameRequest(string DisplayName);
