using MagicVilla_VillaAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace MagicVilla_VillaAPI.Services
{
    public class BookingAutomationService : IBookingAutomationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<BookingAutomationService> _logger;

        public BookingAutomationService(ApplicationDbContext context, ILogger<BookingAutomationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task SyncCompletedBookingsAsync()
        {
            _logger.LogInformation("Hangfire Job: Checking bookings for auto-completion...");

            var today = DateTime.UtcNow.Date;

            // Jin bookings ki checkout date guzar chuki hai aur status Confirmed hai
            var expiredBookings = await _context.Bookings
                .Where(b => b.CheckOutDate < today && b.Status == "Confirmed")
                .ToListAsync();

            if (expiredBookings.Any())
            {
                foreach (var booking in expiredBookings)
                {
                    booking.Status = "Completed";
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Hangfire Job: {Count} bookings marked as Completed.", expiredBookings.Count);
            }
            else
            {
                _logger.LogInformation("Hangfire Job: No expired bookings found.");
            }
        }
    }
}