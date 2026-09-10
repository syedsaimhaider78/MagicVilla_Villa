using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace MagicVilla_VillaAPI.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task SendNotification(string title, string message)
        {
            await Clients.All.SendAsync("ReceiveBookingNotification", new
            {
                title,
                message,
                timestamp = DateTime.UtcNow
            });
        }
    }
}
