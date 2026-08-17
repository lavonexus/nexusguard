using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEnterpriseWorkspaceSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DiscordUrl",
                table: "Servers",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Servers",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowAllScansToMembers",
                table: "Servers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscordUrl",
                table: "Servers");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Servers");

            migrationBuilder.DropColumn(
                name: "ShowAllScansToMembers",
                table: "Servers");
        }
    }
}
