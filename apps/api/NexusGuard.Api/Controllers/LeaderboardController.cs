using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Auth;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;

namespace NexusGuard.Api.Controllers;

// Global, platform-wide "who scans the most" - every NexusGuard user across every server, not
// just one team. Reachable by any logged-in dashboard user (not gated by server ownership,
// unlike everything under ServersController) since it isn't about any one server's own data.
[ApiController]
[Route("api/leaderboard")]
[Authorize(AuthenticationSchemes = DashboardSessionAuthenticationOptions.SchemeName)]
public class LeaderboardController : ControllerBase
{
    private readonly NexusGuardDbContext _db;

    public LeaderboardController(NexusGuardDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<GlobalLeaderboardEntryResponse>>> Get([FromQuery] string period = "weekly")
    {
        var windowDays = period == "monthly" ? 30 : 7;
        var since = DateTime.UtcNow.AddDays(-windowDays);

        var scans = await _db.ScanSessions
            .Include(s => s.Detections)
            .Where(s => s.CreatedByUserId != null && s.CreatedAt >= since)
            .ToListAsync();

        var userIds = scans.Select(s => s.CreatedByUserId!.Value).Distinct().ToList();
        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var ranked = scans
            .GroupBy(s => s.CreatedByUserId!.Value)
            .Select(g =>
            {
                users.TryGetValue(g.Key, out var user);
                return new GlobalLeaderboardEntryResponse(
                    g.Key,
                    user?.Username ?? "(bilinmiyor)",
                    user?.AvatarUrl,
                    user?.LastLoginProvider,
                    g.Count(),
                    g.Sum(s => s.Detections.Count));
            })
            .OrderByDescending(e => e.ScanCount)
            .ThenByDescending(e => e.DetectionCount)
            .Take(100)
            .ToList();

        return ranked;
    }
}
