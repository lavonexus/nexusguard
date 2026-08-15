using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlansExpiryAndSiteAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSiteAdmin",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "EnterpriseSeats",
                table: "Servers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlanExpiresAt",
                table: "Servers",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSiteAdmin",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EnterpriseSeats",
                table: "Servers");

            migrationBuilder.DropColumn(
                name: "PlanExpiresAt",
                table: "Servers");
        }
    }
}
