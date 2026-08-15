using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScanAttributionAndLeaderboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "ScanSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScanSessions_CreatedByUserId",
                table: "ScanSessions",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ScanSessions_Users_CreatedByUserId",
                table: "ScanSessions",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScanSessions_Users_CreatedByUserId",
                table: "ScanSessions");

            migrationBuilder.DropIndex(
                name: "IX_ScanSessions_CreatedByUserId",
                table: "ScanSessions");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "ScanSessions");
        }
    }
}
