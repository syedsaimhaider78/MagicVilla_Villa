using System.ComponentModel.DataAnnotations;

namespace MagicVilla_VillaAPI.Models
{
    public class ChatMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string SenderName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string GroupName { get; set; } = string.Empty;

        [Required]
        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public bool IsSystem { get; set; } = false;

        [MaxLength(100)]
        public string? ReceiverName { get; set; }

        public bool IsDelivered { get; set; } = false;

        public DateTime? DeliveredAt { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime? ReadAt { get; set; }

        [MaxLength(100)]
        public string? ReadBy { get; set; }
    }
}
