using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MagicVilla_VillaAPI.Models
{
    public class Booking
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int VillaId { get; set; }

        public int? UserId { get; set; }

        [Required]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        public string CustomerEmail { get; set; } = string.Empty;

        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }

        [Required]
        public int NumberOfNights { get; set; }

        [Required]
        public decimal Price { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Confirmed, Cancelled

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        [ForeignKey("VillaId")]
        public Villa? Villa { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }
    }
}