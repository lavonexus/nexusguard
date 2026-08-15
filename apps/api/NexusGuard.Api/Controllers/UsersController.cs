using Microsoft.AspNetCore.Mvc;
using NexusGuard.Api.Database;
using NexusGuard.Api.DTOs;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Controllers;

// NOTE: intentionally unauthenticated in Phase 1 so the API is usable end-to-end locally
// before Discord OAuth (Phase 6) exists. Do not expose this endpoint publicly.
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly NexusGuardDbContext _db;

    public UsersController(NexusGuardDbContext db) => _db = db;

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
            return BadRequest("Username is required.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = user.Id },
            new UserResponse(user.Id, user.Username, user.DisplayName, user.Email, user.CreatedAt, false, false, 0, false));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Get(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();

        return new UserResponse(
            user.Id, user.Username, user.DisplayName, user.Email, user.CreatedAt,
            false, false, 0, user.IsSiteAdmin);
    }
}
