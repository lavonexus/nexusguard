using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScannerTheme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServerThemes",
                columns: table => new
                {
                    ServerId = table.Column<Guid>(type: "uuid", nullable: false),
                    PrimaryTextColor = table.Column<string>(type: "text", nullable: false),
                    SecondaryTextColor = table.Column<string>(type: "text", nullable: false),
                    BackgroundColor = table.Column<string>(type: "text", nullable: false),
                    SurfaceColor = table.Column<string>(type: "text", nullable: false),
                    TitleBarColor = table.Column<string>(type: "text", nullable: false),
                    AccentColor = table.Column<string>(type: "text", nullable: false),
                    ProgressColor = table.Column<string>(type: "text", nullable: false),
                    PinTitle = table.Column<string>(type: "text", nullable: false),
                    PinSubtitle = table.Column<string>(type: "text", nullable: false),
                    StageEarlyText = table.Column<string>(type: "text", nullable: false),
                    StageScanningText = table.Column<string>(type: "text", nullable: false),
                    StageDeepText = table.Column<string>(type: "text", nullable: false),
                    StageDetectionText = table.Column<string>(type: "text", nullable: false),
                    CompletedTitle = table.Column<string>(type: "text", nullable: false),
                    CompletedSubtitle = table.Column<string>(type: "text", nullable: false),
                    LogoBase64 = table.Column<string>(type: "text", nullable: true),
                    ShowWatermark = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServerThemes", x => x.ServerId);
                    table.ForeignKey(
                        name: "FK_ServerThemes_Servers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "Servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServerThemes");
        }
    }
}
