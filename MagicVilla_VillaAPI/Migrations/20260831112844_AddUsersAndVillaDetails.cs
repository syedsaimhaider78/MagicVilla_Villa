using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MagicVilla_VillaAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddUsersAndVillaDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Bookings",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Bookings",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Villas",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Villas",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.AddColumn<string>(
                name: "Amenities",
                table: "Villas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Villas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Villas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedDate",
                table: "Villas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerEmail",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Bookings",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedDate", "Email", "Name", "PasswordHash", "Role" },
                values: new object[] { 1, new DateTime(2026, 8, 21, 0, 0, 0, 0, DateTimeKind.Utc), "admin@magicvilla.com", "System Admin", "$2a$11$qR0qWzR7tQjHk6YmU8V2geG7qA8rW9sD4eF5gH6jK7lM8nO9pQ0rS", "Admin" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_Users_UserId",
                table: "Bookings",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_Users_UserId",
                table: "Bookings");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Amenities",
                table: "Villas");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Villas");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Villas");

            migrationBuilder.DropColumn(
                name: "UpdatedDate",
                table: "Villas");

            migrationBuilder.DropColumn(
                name: "CustomerEmail",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Bookings");

            migrationBuilder.InsertData(
                table: "Villas",
                columns: new[] { "Id", "CreatedDate", "Name", "Occupancy", "Price", "Sqft" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 8, 21, 0, 0, 0, 0, DateTimeKind.Unspecified), "Lake View", 10, 3000m, 1000 },
                    { 2, new DateTime(2026, 8, 21, 0, 0, 0, 0, DateTimeKind.Unspecified), "Sea View", 12, 5000m, 1500 }
                });

            migrationBuilder.InsertData(
                table: "Bookings",
                columns: new[] { "Id", "CheckInDate", "CheckOutDate", "CreatedDate", "NumberOfNights", "Price", "Status", "VillaId" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 9, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Unspecified), new DateTime(2026, 8, 21, 0, 0, 0, 0, DateTimeKind.Unspecified), 4, 12000m, "Confirmed", 1 },
                    { 2, new DateTime(2026, 9, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), new DateTime(2026, 9, 15, 0, 0, 0, 0, DateTimeKind.Unspecified), new DateTime(2026, 8, 21, 0, 0, 0, 0, DateTimeKind.Unspecified), 5, 25000m, "Pending", 2 }
                });
        }
    }
}
