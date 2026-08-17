namespace NexusGuard.Api.DTOs;

// OwnerUserId is only needed for the unauthenticated Phase 1 bootstrap flow - a logged-in
// dashboard session (Phase 6) supplies the owner implicitly instead.
public record CreateServerRequest(string Name, Guid? OwnerUserId = null);

// ApiKey is only ever present in this one response - it cannot be retrieved again later,
// only rotated via POST /api/servers/{id}/apikey.
public record CreateServerResponse(Guid Id, string Name, string ApiKey);

public record RotateApiKeyResponse(string ApiKey);

public record ServerResponse(
    Guid Id, string Name, DateTime CreatedAt, bool IsActive,
    string Plan, int? EnterpriseSeats, DateTime? PlanExpiresAt, bool NeedsSetup);

public record ServerMemberResponse(Guid Id, Guid UserId, string Username, string Role, DateTime AddedAt);

// A Discord username, a Discord ID, or (for Google-only accounts) the email they registered
// with - see ServersController.AddMember for how the three are told apart.
public record AddMemberRequest(string Identifier);

// Role must be "Manager" or "Member" - promoting/demoting the owner isn't a thing, they're
// never a ServerMember row in the first place (see ServerMember.cs).
public record SetMemberRoleRequest(string Role);

// Same shape as ServerResponse plus the caller's relationship to it - GET /api/servers/mine
// unions owned and member servers, and the dashboard needs to tell them apart (only an
// owner can rotate the key without it being a recovery action, manage billing, etc.).
public record MyServerResponse(
    Guid Id, string Name, DateTime CreatedAt, bool IsActive,
    string Plan, int? EnterpriseSeats, DateTime? PlanExpiresAt, bool NeedsSetup, string Role);

public record RenameServerRequest(string Name);

