using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDetectionCategoryAndMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Detections",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "OTHER");

            migrationBuilder.AddColumn<string>(
                name: "Confidence",
                table: "Detections",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<DateTime>(
                name: "FirstSeenUtc",
                table: "Detections",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedUtc",
                table: "Detections",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Publisher",
                table: "Detections",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sha256",
                table: "Detections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Signed",
                table: "Detections",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Detections",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Active");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "Confidence",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "FirstSeenUtc",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "LastModifiedUtc",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "Publisher",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "Sha256",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "Signed",
                table: "Detections");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Detections");
        }
    }
}
