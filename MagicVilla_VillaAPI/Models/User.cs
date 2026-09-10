using System.ComponentModel.DataAnnotations;

namespace MagicVilla_VillaAPI.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "Customer"; // "Admin" or "Customer"

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}