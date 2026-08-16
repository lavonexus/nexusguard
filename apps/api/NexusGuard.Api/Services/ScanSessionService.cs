using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Database;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Services;

public class ScanSessionService : IScanSessionService
{
    private readonly NexusGuardDbContext _db;
    private readonly ITokenService _tokens;
    private readonly int _pinTtlMinutes;
    private readonly int _scanTokenTtlMinutes;

    public ScanSessionService(NexusGuardDbContext db, ITokenService tokens, IConfiguration config)
    {
        _db = db;
        _tokens = tokens;
        _pinTtlMinutes = config.GetValue<int?>("ScanTokens:PinTtlMinutes") ?? 10;
        _scanTokenTtlMinutes = config.GetValue<int?>("ScanTokens:ScanTokenTtlMinutes") ?? 45;
    }

    public async Task<(ScanSession Session, string Pin)> CreateAsync(
        Guid serverId, string? playerIdentifier, Guid? createdByUserId, CancellationToken ct = default,
        string? discordUserId = null, string? discordUsername = null, string? discordAvatarUrl = null)
    {
        var pin = _tokens.GeneratePin();

        var session = new ScanSession
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            CreatedByUserId = createdByUserId,
            PlayerIdentifier = string.IsNullOrWhiteSpace(playerIdentifier)
                ? $"Tarama-{pin[..4]}"
                : playerIdentifier.Trim(),
            Status = ScanSessionStatus.Pending,
            PinHash = _tokens.Hash(pin),
            PinExpiresAt = DateTime.UtcNow.AddMinutes(_pinTtlMinutes),
            CreatedAt = DateTime.UtcNow,
            DiscordUserId = discordUserId,
            DiscordUsername = discordUsername,
            DiscordAvatarUrl = discordAvatarUrl,
        };

        _db.ScanSessions.Add(session);
        await _db.SaveChangesAsync(ct);

        return (session, pin);
    }

    public async Task<(ScanSession Session, string ScanToken)?> ExchangePinAsync(Guid scanId, string pin, CancellationToken ct = default)
    {
        var session = await _db.ScanSessions.FirstOrDefaultAsync(s => s.Id == scanId, ct);
        if (session is null) return null;

        if (session.Status != ScanSessionStatus.Pending) return null;
        if (session.PinExpiresAt < DateTime.UtcNow)
        {
            session.Status = ScanSessionStatus.Expired;
            await _db.SaveChangesAsync(ct);
            return null;
        }
        if (!_tokens.Verify(pin, session.PinHash)) return null;

        var scanToken = _tokens.GenerateOpaqueToken();
        session.ScanTokenPrefix = _tokens.Prefix(scanToken);
        session.ScanTokenHash = _tokens.Hash(scanToken);
        session.ScanTokenExpiresAt = DateTime.UtcNow.AddMinutes(_scanTokenTtlMinutes);
        session.Status = ScanSessionStatus.TokenIssued;
        session.StartedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return (session, scanToken);
    }

    public async Task<(ScanSession Session, string ScanToken)?> ExchangePinOnlyAsync(string pin, CancellationToken ct = default)
    {
        var candidates = await _db.ScanSessions
            .Where(s => s.Status == ScanSessionStatus.Pending && s.PinExpiresAt >= DateTime.UtcNow)
            .ToListAsync(ct);

        var session = candidates.FirstOrDefault(s => _tokens.Verify(pin, s.PinHash));
        if (session is null) return null;

        var scanToken = _tokens.GenerateOpaqueToken();
        session.ScanTokenPrefix = _tokens.Prefix(scanToken);
        session.ScanTokenHash = _tokens.Hash(scanToken);
        session.ScanTokenExpiresAt = DateTime.UtcNow.AddMinutes(_scanTokenTtlMinutes);
        session.Status = ScanSessionStatus.TokenIssued;
        session.StartedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return (session, scanToken);
    }

    public async Task<ScanSession?> GetByScanTokenAsync(string scanToken, CancellationToken ct = default)
    {
        var prefix = _tokens.Prefix(scanToken);

        var candidates = await _db.ScanSessions
            .Where(s => s.ScanTokenPrefix == prefix)
            .ToListAsync(ct);

        var session = candidates.FirstOrDefault(s => s.ScanTokenHash is not null && _tokens.Verify(scanToken, s.ScanTokenHash));
        if (session is null) return null;

        if (session.ScanTokenExpiresAt is null || session.ScanTokenExpiresAt < DateTime.UtcNow)
        {
            if (session.Status is ScanSessionStatus.TokenIssued or ScanSessionStatus.InProgress)
            {
                session.Status = ScanSessionStatus.Expired;
                await _db.SaveChangesAsync(ct);
            }
            return null;
        }

        if (session.Status is ScanSessionStatus.Completed or ScanSessionStatus.Cancelled or ScanSessionStatus.Failed or ScanSessionStatus.Expired)
            return null;

        return session;
    }

    public async Task RecordHeartbeatAsync(ScanSession session, CancellationToken ct = default)
    {
        session.LastHeartbeatAt = DateTime.UtcNow;
        if (session.Status == ScanSessionStatus.TokenIssued)
            session.Status = ScanSessionStatus.InProgress;

        await _db.SaveChangesAsync(ct);
    }

    public async Task AddResultAsync(ScanSession session, ScanResultType type, string dataJson, CancellationToken ct = default)
    {
        _db.ScanResults.Add(new ScanResult
        {
            Id = Guid.NewGuid(),
            ScanSessionId = session.Id,
            ResultType = type,
            DataJson = dataJson,
            CreatedAt = DateTime.UtcNow
        });

        if (session.Status == ScanSessionStatus.TokenIssued)
            session.Status = ScanSessionStatus.InProgress;

        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkInProgressAsync(ScanSession session, CancellationToken ct = default)
    {
        if (session.Status != ScanSessionStatus.TokenIssued) return;

        session.Status = ScanSessionStatus.InProgress;
        await _db.SaveChangesAsync(ct);
    }

    public async Task CompleteAsync(ScanSession session, int riskScore, string? aiSummary, CancellationToken ct = default)
    {
        session.Status = ScanSessionStatus.Completed;
        session.CompletedAt = DateTime.UtcNow;
        session.RiskScore = Math.Clamp(riskScore, 0, 100);
        session.AiSummary = aiSummary;

        // The scan token is single-purpose - burn it so it can't be replayed once the
        // scan is done, even though it would also fail the expiry check eventually.
        session.ScanTokenHash = null;
        session.ScanTokenPrefix = null;

        await _db.SaveChangesAsync(ct);
    }

    public async Task<ScanResult?> GetLatestResultAsync(Guid sessionId, ScanResultType type, CancellationToken ct = default) =>
        await _db.ScanResults
            .Where(r => r.ScanSessionId == sessionId && r.ResultType == type)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);
}
