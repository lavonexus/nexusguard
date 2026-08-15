namespace NexusGuard.Api.DTOs;

// Site-admin-only views - never returned to a regular dashboard session. See AdminController's
// RequireSiteAdminAsync guard.
public record AdminUserResponse(
    Guid Id, string Username, string? DisplayName, string? Email,
    bool DiscordLinked, bool GoogleLinked, bool IsSiteAdmin, DateTime CreatedAt);

public record AdminServerResponse(
    Guid Id, string Name, Guid OwnerUserId, string OwnerUsername,
    string Plan, int? EnterpriseSeats, DateTime? PlanExpiresAt, int MemberCount, DateTime CreatedAt);

// DurationDays is null for an indefinite grant (only a site admin can hand these out - there's
// no self-serve equivalent). EnterpriseSeats is required (5, 10, or 15) when Plan is
// "Enterprise" and ignored otherwise.
public record AdminSetPlanRequest(string Plan, int? EnterpriseSeats, int? DurationDays);

public record AdminSetSiteAdminRequest(string Username, bool IsSiteAdmin);
