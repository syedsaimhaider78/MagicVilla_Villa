using System.ComponentModel.DataAnnotations;

namespace MagicVilla_VillaAPI.DTO
{
    public class VillaDto
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int Occupancy { get; set; }

        public int Sqft { get; set; }

        public decimal Price { get; set; }

        public string? Description { get; set; }

        public string? ImageUrl { get; set; }

        public string? Amenities { get; set; }

        [MaxLength(50)]
        public string PropertyType { get; set; } = "Villa";
    }

    public class VillaCreateDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int Occupancy { get; set; }

        public int Sqft { get; set; }

        public decimal Price { get; set; }

        public string? Description { get; set; }

        public string? ImageUrl { get; set; }

        public string? Amenities { get; set; }

        [MaxLength(50)]
        public string PropertyType { get; set; } = "Villa";
    }

    public class VillaUpdateDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int Occupancy { get; set; }

        public int Sqft { get; set; }

        public decimal Price { get; set; }

        public string? Description { get; set; }

        public string? ImageUrl { get; set; }

        public string? Amenities { get; set; }

        [MaxLength(50)]
        public string PropertyType { get; set; } = "Villa";
    }
}