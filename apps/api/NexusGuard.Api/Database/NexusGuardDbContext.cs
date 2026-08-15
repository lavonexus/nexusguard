using Microsoft.EntityFrameworkCore;
using NexusGuard.Api.Models;

namespace NexusGuard.Api.Database;

public class NexusGuardDbContext : DbContext
{
    public NexusGuardDbContext(DbContextOptions<NexusGuardDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Server> Servers => Set<Server>();
    public DbSet<ScanSession> ScanSessions => Set<ScanSession>();
    public DbSet<ScanResult> ScanResults => Set<ScanResult>();
    public DbSet<Detection> Detections => Set<Detection>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<ServerMember> ServerMembers => Set<ServerMember>();
    public DbSet<ServerTheme> ServerThemes => Set<ServerTheme>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.DiscordId).IsUnique(false);
            e.HasIndex(u => u.GoogleId).IsUnique(false);
            e.Property(u => u.Username).IsRequired().HasMaxLength(64);
            e.Property(u => u.IsSiteAdmin).HasDefaultValue(false);
        });

        modelBuilder.Entity<Server>(e =>
        {
            e.HasIndex(s => s.ApiKeyPrefix).IsUnique();
            e.Property(s => s.Name).IsRequired().HasMaxLength(128);
            e.Property(s => s.Plan).IsRequired().HasMaxLength(16).HasDefaultValue("Free");
            e.Property(s => s.NeedsSetup).HasDefaultValue(false);
            e.HasOne(s => s.Owner)
                .WithMany(u => u.Servers)
                .HasForeignKey(s => s.OwnerUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServerMember>(e =>
        {
            e.HasIndex(m => new { m.ServerId, m.UserId }).IsUnique();
            e.Property(m => m.Role).IsRequired().HasMaxLength(32);
            e.HasOne(m => m.Server)
                .WithMany(s => s.Members)
                .HasForeignKey(m => m.ServerId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.User)
                .WithMany()
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ScanSession>(e =>
        {
            e.HasIndex(s => s.ScanTokenPrefix);
            e.Property(s => s.PlayerIdentifier).IsRequired().HasMaxLength(128);
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(32);
            e.HasOne(s => s.Server)
                .WithMany(sv => sv.ScanSessions)
                .HasForeignKey(s => s.ServerId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.CreatedByUser)
                .WithMany()
                .HasForeignKey(s => s.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ScanResult>(e =>
        {
            e.Property(r => r.ResultType).HasConversion<string>().HasMaxLength(32);
            e.Property(r => r.DataJson).HasColumnType("jsonb");
            e.HasOne(r => r.ScanSession)
                .WithMany(s => s.Results)
                .HasForeignKey(r => r.ScanSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Detection>(e =>
        {
            e.Property(d => d.RuleId).IsRequired().HasMaxLength(64);
            e.Property(d => d.Description).IsRequired();
            e.Property(d => d.Evidence).HasMaxLength(1024);
            e.HasOne(d => d.ScanSession)
                .WithMany(s => s.Detections)
                .HasForeignKey(d => d.ScanSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSession>(e =>
        {
            e.HasIndex(s => s.TokenHash).IsUnique();
            e.HasOne(s => s.User)
                .WithMany(u => u.Sessions)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServerTheme>(e =>
        {
            e.HasKey(t => t.ServerId);
            e.Property(t => t.LogoBase64).HasColumnType("text");
            e.HasOne(t => t.Server)
                .WithOne(s => s.Theme)
                .HasForeignKey<ServerTheme>(t => t.ServerId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
