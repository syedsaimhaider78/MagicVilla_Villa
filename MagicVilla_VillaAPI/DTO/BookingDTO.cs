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
    }
}
