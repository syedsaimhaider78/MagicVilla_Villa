using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MagicVilla_VillaAPI.DTO
{
    public class BookingDto
    {
        public int Id { get; set; }
        public int VillaId { get; set; }
        public int? UserId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string? VillaName { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public int NumberOfNights { get; set; }
        public decimal Price { get; set; }
        public string Status { get; set; } = "Pending";
        public string PurposeOfVisit { get; set; } = string.Empty;
        public string? DocumentUrl { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class BookingCreateDto
    {
        [Required]
        public int VillaId { get; set; }

        public string? CustomerName { get; set; }

        public string? CustomerEmail { get; set; }

        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }

        [Required]
        public string PurposeOfVisit { get; set; } = string.Empty;

        public IFormFile? Document { get; set; }
    }

    public class BookingStatusUpdateDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}
