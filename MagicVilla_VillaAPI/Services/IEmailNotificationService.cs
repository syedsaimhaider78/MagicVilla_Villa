namespace MagicVilla_VillaAPI.Services
{
    public interface IEmailNotificationService
    {
        Task SendBookingAlertToAdminAsync(int bookingId);
        Task SendPeriodicSummaryReportAsync(); 
    }
}