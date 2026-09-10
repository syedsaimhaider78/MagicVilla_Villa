using System.ComponentModel.DataAnnotations;

namespace MagicVilla_VillaAPI.Models
{
    public class Villa
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int Occupancy { get; set; }

        [Required]
        public int Sqft { get; set; }

        public decimal Price { get; set; }

        public string? Description { get; set; }

        public string? ImageUrl { get; set; }

        public string? Amenities { get; set; }

        [MaxLength(50)]
        public string PropertyType { get; set; } = "Villa"; // "Villa", "HotelRoom", "Apartment"

        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public DateTime? UpdatedDate { get; set; }
    }
}