using Microsoft.EntityFrameworkCore;
using MagicVilla_VillaAPI.Models;

namespace MagicVilla_VillaAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Villa> Villas { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Villa>()
                .Property(v => v.Price)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Villa>()
                .Property(v => v.PropertyType)
                .HasMaxLength(50)
                .HasDefaultValue("Villa");

            modelBuilder.Entity<Booking>()
                .Property(b => b.Price)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Villa)
                .WithMany()
                .HasForeignKey(b => b.VillaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.User)
                .WithMany()
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            // Seed Admin User (Password: Admin@123)
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Name = "System Admin",
                    Email = "admin@magicvilla.com",
                    PasswordHash = "Saim@4646", // static pre-computed hash
                    Role = "Admin",
                    CreatedDate = new DateTime(2026, 8, 21, 0, 0, 0, DateTimeKind.Utc)
                }
            );
           
        }
    }
}