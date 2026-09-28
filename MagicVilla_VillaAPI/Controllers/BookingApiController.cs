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
        private readonly IWebHostEnvironment _environment;

        public BookingApiController(
            ApplicationDbContext context, 
            IHubContext<NotificationHub> hubContext,
            IWebHostEnvironment environment)
        {
            _context = context;
            _hubContext = hubContext;
            _environment = environment;
        }

        private static BookingDto ToDto(Booking booking) => new()
        {
            Id = booking.Id,
            VillaId = booking.VillaId,
            UserId = booking.UserId,
            CustomerName = booking.CustomerName,
            CustomerEmail = booking.CustomerEmail,
            VillaName = booking.Villa?.Name,
            CheckInDate = booking.CheckInDate,
            CheckOutDate = booking.CheckOutDate,
            NumberOfNights = booking.NumberOfNights,
            Price = booking.Price,
            Status = booking.Status,
            PurposeOfVisit = booking.PurposeOfVisit,
            DocumentUrl = booking.DocumentUrl,
            CreatedDate = booking.CreatedDate
        };

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings()
        {
            var bookings = await _context.Bookings
                .Include(b => b.Villa)
                .OrderByDescending(b => b.CreatedDate)
                .ToListAsync();
            return Ok(bookings.Select(ToDto));
        }

        [Authorize]
        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetMyBookings()
        {
            var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("nameid")?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(rawId, out var userId))
            {
                return Unauthorized(new { message = "User identifier could not be determined from the security token." });
            }

            var bookings = await _context.Bookings
                .Include(b => b.Villa)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedDate)
                .ToListAsync();
            return Ok(bookings.Select(ToDto));
        }

        [Authorize]
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<BookingDto>> CreateBooking([FromForm] BookingCreateDto dto)
        {
            var checkIn = dto.CheckInDate.Date;
            var checkOut = dto.CheckOutDate.Date;

            if (checkIn < DateTime.UtcNow.Date || checkOut <= checkIn)
                return BadRequest(new { isSuccess = false, message = "Please select valid booking dates." });

            var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("nameid")?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(rawId, out var userId))
            {
                return Unauthorized(new { isSuccess = false, message = "User identifier could not be determined from token." });
            }

            var user = await _context.Users.FindAsync(userId);
            var villa = await _context.Villas.FindAsync(dto.VillaId);
            if (user == null || villa == null) 
                return BadRequest(new { isSuccess = false, message = "Villa or user was not found." });

            // Check for date overlap conflicts with existing active bookings
            var conflictingBookings = await _context.Bookings
                .Where(b => b.VillaId == dto.VillaId
                            && b.Status != "Cancelled"
                            && b.Status != "Rejected"
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

            // Handle optional document upload (Passport / CNIC - max 2MB)
            string? documentUrl = null;
            if (dto.Document != null && dto.Document.Length > 0)
            {
                const long maxFileSize = 2 * 1024 * 1024; // 2MB
                if (dto.Document.Length > maxFileSize)
                {
                    return BadRequest(new { isSuccess = false, message = "Document attachment must be smaller than 2MB." });
                }

                var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png", ".webp" };
                var extension = Path.GetExtension(dto.Document.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new { isSuccess = false, message = "Only PDF and image files (JPG, PNG, WEBP) are supported." });
                }

                var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var uploadDir = Path.Combine(webRoot, "uploads", "documents");
                if (!Directory.Exists(uploadDir))
                {
                    Directory.CreateDirectory(uploadDir);
                }

                var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
                var filePath = Path.Combine(uploadDir, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Document.CopyToAsync(stream);
                }

                documentUrl = $"/uploads/documents/{uniqueFileName}";
            }

            var nights = (dto.CheckOutDate.Date - dto.CheckInDate.Date).Days;
            var customerName = !string.IsNullOrWhiteSpace(dto.CustomerName) ? dto.CustomerName.Trim() : user.Name;
            var customerEmail = !string.IsNullOrWhiteSpace(dto.CustomerEmail) ? dto.CustomerEmail.Trim() : user.Email;
            var purpose = !string.IsNullOrWhiteSpace(dto.PurposeOfVisit) ? dto.PurposeOfVisit.Trim() : "Holidays";

            var booking = new Booking
            {
                VillaId = villa.Id,
                UserId = user.Id,
                CustomerName = customerName,
                CustomerEmail = customerEmail,
                CheckInDate = dto.CheckInDate.Date,
                CheckOutDate = dto.CheckOutDate.Date,
                NumberOfNights = nights,
                Price = nights * villa.Price,
                PurposeOfVisit = purpose,
                DocumentUrl = documentUrl,
                Status = "Pending",
                CreatedDate = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            booking.Villa = villa;

            if (booking.Id > 0)
            {
                BackgroundJob.Enqueue<IEmailNotificationService>(s => s.SendBookingAlertToAdminAsync(booking.Id));

                await _hubContext.Clients.All.SendAsync("ReceiveBookingNotification", new
                {
                    title = "New Booking Request Received!",
                    message = $"New reservation request for {villa.Name ?? "Villa #" + booking.VillaId} by {booking.CustomerName} ({booking.PurposeOfVisit}). Awaiting review.",
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
            var validStatuses = new[] { "Pending", "Approved", "Confirmed", "Rejected", "Cancelled", "Completed" };
            if (!validStatuses.Contains(dto.Status, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = "Invalid reservation status." });

            var booking = await _context.Bookings.Include(b => b.Villa).FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();

            booking.Status = dto.Status;
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveBookingNotification", new
            {
                title = $"Booking {dto.Status}",
                message = $"Reservation #{booking.Id} for {booking.Villa?.Name ?? "Villa"} was updated to {dto.Status}.",
                timestamp = DateTime.UtcNow,
                bookingId = booking.Id
            });

            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}/approve")]
        public async Task<IActionResult> ApproveBooking(int id)
        {
            var booking = await _context.Bookings.Include(b => b.Villa).FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();

            booking.Status = "Approved";
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveBookingNotification", new
            {
                title = "Booking Approved!",
                message = $"Reservation #{booking.Id} for {booking.CustomerName} ({booking.Villa?.Name}) has been approved.",
                timestamp = DateTime.UtcNow,
                bookingId = booking.Id
            });

            return Ok(new { isSuccess = true, message = "Reservation approved successfully.", booking = ToDto(booking) });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}/reject")]
        public async Task<IActionResult> RejectBooking(int id, [FromBody] BookingStatusUpdateDto? dto)
        {
            var booking = await _context.Bookings.Include(b => b.Villa).FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();

            booking.Status = "Rejected";
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveBookingNotification", new
            {
                title = "Booking Rejected",
                message = $"Reservation #{booking.Id} for {booking.CustomerName} has been rejected.",
                timestamp = DateTime.UtcNow,
                bookingId = booking.Id
            });

            return Ok(new { isSuccess = true, message = "Reservation rejected.", booking = ToDto(booking) });
        }

        [AllowAnonymous]
        [HttpGet("document/{fileName}")]
        public IActionResult GetDocument(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return BadRequest(new { message = "File name is required." });

            var sanitized = Path.GetFileName(fileName);
            var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var primaryPath = Path.Combine(webRoot, "uploads", "documents", sanitized);
            var fallbackPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "documents", sanitized);

            var filePath = System.IO.File.Exists(primaryPath) ? primaryPath 
                         : System.IO.File.Exists(fallbackPath) ? fallbackPath 
                         : null;

            if (filePath == null)
            {
                return NotFound(new { message = "Document not found." });
            }

            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            var contentType = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".pdf" => "application/pdf",
                _ => "application/octet-stream"
            };

            return PhysicalFile(filePath, contentType);
        }
    }
}
