using System.Security.Claims;
using Hangfire;
using MagicVilla_VillaAPI.Data;
using MagicVilla_VillaAPI.DTO;
using MagicVilla_VillaAPI.Hubs;
using MagicVilla_VillaAPI.Models;
using MagicVilla_VillaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace MagicVilla_VillaAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public BookingApiController(ApplicationDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        private static BookingDto ToDto(Booking booking) => new()
        {
            Id = booking.Id, VillaId = booking.VillaId, UserId = booking.UserId,
            CustomerName = booking.CustomerName, CustomerEmail = booking.CustomerEmail,
            VillaName = booking.Villa?.Name, CheckInDate = booking.CheckInDate,
            CheckOutDate = booking.CheckOutDate, NumberOfNights = booking.NumberOfNights,
            Price = booking.Price, Status = booking.Status
        };

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings()
        {
            var bookings = await _context.Bookings.Include(b => b.Villa).ToListAsync();
            return Ok(bookings.Select(ToDto));
        }

        [Authorize]
        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetMyBookings()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var bookings = await _context.Bookings.Include(b => b.Villa)
                .Where(b => b.UserId == userId).OrderByDescending(b => b.CreatedDate).ToListAsync();
            return Ok(bookings.Select(ToDto));
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] BookingDto dto)
        {
            var checkIn = dto.CheckInDate.Date;
            var checkOut = dto.CheckOutDate.Date;

            if (checkIn < DateTime.UtcNow.Date || checkOut <= checkIn)
                return BadRequest(new { isSuccess = false, message = "Please select valid booking dates." });

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _context.Users.FindAsync(userId);
            var villa = await _context.Villas.FindAsync(dto.VillaId);
            if (user == null || villa == null) return BadRequest(new { isSuccess = false, message = "Villa or user was not found." });

            // Check for date overlap conflicts with existing non-cancelled bookings
            var conflictingBookings = await _context.Bookings
                .Where(b => b.VillaId == dto.VillaId
                            && b.Status != "Cancelled"
                            && checkIn < b.CheckOutDate
                            && checkOut > b.CheckInDate)
                .ToListAsync();

            if (conflictingBookings.Any())
            {
                var nextAvailableDate = conflictingBookings.Max(b => b.CheckOutDate);
                return BadRequest(new
                {
                    isSuccess = false,
                    message = $"This villa is already booked for these dates. It will be available from {nextAvailableDate:dd MMM yyyy}."
                });
            }

            var nights = (dto.CheckOutDate.Date - dto.CheckInDate.Date).Days;
            var booking = new Booking
            {
                VillaId = villa.Id, UserId = user.Id, CustomerName = user.Name, CustomerEmail = user.Email,
                CheckInDate = dto.CheckInDate.Date, CheckOutDate = dto.CheckOutDate.Date,
                NumberOfNights = nights, Price = nights * villa.Price, Status = "Pending", CreatedDate = DateTime.UtcNow
            };
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            booking.Villa = villa;

            if (booking.Id > 0)
            {
                BackgroundJob.Enqueue<IEmailNotificationService>(s => s.SendBookingAlertToAdminAsync(booking.Id));

                await _hubContext.Clients.All.SendAsync("ReceiveBookingNotification", new
                {
                    title = "New Booking Confirmed!",
                    message = $"Reservation confirmed for {villa.Name ?? "Villa #" + booking.VillaId} by {booking.CustomerName ?? "Guest"}.",
                    timestamp = DateTime.UtcNow,
                    bookingId = booking.Id
                });
            }

            return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, ToDto(booking));
        }

        [Authorize]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<BookingDto>> GetBooking(int id)
        {
            var booking = await _context.Bookings.Include(b => b.Villa).FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!User.IsInRole("Admin") && booking.UserId?.ToString() != userId) return Forbid();
            return Ok(ToDto(booking));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateBooking(int id, [FromBody] BookingDto dto)
        {
            if (dto.Status is not ("Pending" or "Confirmed" or "Cancelled"))
                return BadRequest(new { message = "Invalid reservation status." });
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return NotFound();
            booking.Status = dto.Status;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
