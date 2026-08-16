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

// A Discord username or (for Google-only accounts) the email they registered with - see
// ServersController.AddMember for how the two are told apart.
public record AddMemberRequest(string Identifier);

// Same shape as ServerResponse plus the caller's relationship to it - GET /api/servers/mine
// unions owned and member servers, and the dashboard needs to tell them apart (only an
// owner can rotate the key without it being a recovery action, manage billing, etc.).
public record MyServerResponse(
    Guid Id, string Name, DateTime CreatedAt, bool IsActive,
    string Plan, int? EnterpriseSeats, DateTime? PlanExpiresAt, bool NeedsSetup, string Role);

public record RenameServerRequest(string Name);

