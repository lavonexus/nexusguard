using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAvatarAndGlobalLeaderboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "Users",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastLoginProvider",
                table: "Users",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLoginProvider",
                table: "Users");
        }
    }
}
