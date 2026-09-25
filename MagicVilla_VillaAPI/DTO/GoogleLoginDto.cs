using System.ComponentModel.DataAnnotations;

namespace MagicVilla_VillaAPI.DTO
{
    public class GoogleLoginDto
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }
}
