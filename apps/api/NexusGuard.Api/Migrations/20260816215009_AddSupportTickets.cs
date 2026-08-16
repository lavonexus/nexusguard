using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SupportTickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DiscordChannelId = table.Column<long>(type: "bigint", nullable: false),
                    DiscordGuildId = table.Column<long>(type: "bigint", nullable: false),
                    TicketNumber = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    DiscordUserId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedByUsername = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTickets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SupportTicketMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportTicketId = table.Column<Guid>(type: "uuid", nullable: false),
                    DiscordMessageId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorDiscordId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AuthorUsername = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AuthorAvatarUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    IsStaff = table.Column<bool>(type: "boolean", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTicketMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportTicketMessages_SupportTickets_SupportTicketId",
                        column: x => x.SupportTicketId,
                        principalTable: "SupportTickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SupportTicketMessages_SupportTicketId_DiscordMessageId",
                table: "SupportTicketMessages",
                columns: new[] { "SupportTicketId", "DiscordMessageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_DiscordChannelId",
                table: "SupportTickets",
                column: "DiscordChannelId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_DiscordUserId",
                table: "SupportTickets",
                column: "DiscordUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SupportTicketMessages");

            migrationBuilder.DropTable(
                name: "SupportTickets");
        }
    }
}
