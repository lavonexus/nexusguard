using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscordSteamIdentityAndGuildLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DiscordAvatarUrl",
                table: "ScanSessions",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscordUserId",
                table: "ScanSessions",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscordUsername",
                table: "ScanSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SteamAvatarUrl",
                table: "ScanSessions",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SteamId64",
                table: "ScanSessions",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SteamUsername",
                table: "ScanSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DiscordGuildLinks",
                columns: table => new
                {
                    GuildId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscordGuildLinks", x => x.GuildId);
                    table.ForeignKey(
                        name: "FK_DiscordGuildLinks_Servers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "Servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiscordGuildLinks_ServerId",
                table: "DiscordGuildLinks",
                column: "ServerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiscordGuildLinks");

            migrationBuilder.DropColumn(
                name: "DiscordAvatarUrl",
                table: "ScanSessions");

            migrationBuilder.DropColumn(
                name: "DiscordUserId",
                table: "ScanSessions");

            migrationBuilder.DropColumn(
                name: "DiscordUsername",
                table: "ScanSessions");

            migrationBuilder.DropColumn(
                name: "SteamAvatarUrl",
                table: "ScanSessions");

            migrationBuilder.DropColumn(
                name: "SteamId64",
                table: "ScanSessions");

            migrationBuilder.DropColumn(
                name: "SteamUsername",
                table: "ScanSessions");
        }
    }
}
