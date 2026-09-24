using MagicVilla_VillaAPI.Data;
using MagicVilla_VillaAPI.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace MagicVilla_VillaAPI.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(ApplicationDbContext context, ILogger<ChatHub> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task JoinGroup(UserGroupConnection userConnection)
        {
            if (userConnection == null || string.IsNullOrWhiteSpace(userConnection.GroupName))
                return;

            var groupName = userConnection.GroupName.Trim();
            var userName = string.IsNullOrWhiteSpace(userConnection.UserID) ? "Staff Member" : userConnection.UserID.Trim();

            // 1. Add connection to SignalR group
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // 2. Mark existing unread messages from other users in this group as Read
            try
            {
                var unreadFromOthers = await _context.ChatMessages
                    .Where(m => m.GroupName == groupName && !m.IsRead && m.SenderName != userName)
                    .ToListAsync();

                if (unreadFromOthers.Count > 0)
                {
                    var now = DateTime.UtcNow;
                    var readIds = new List<int>();

                    foreach (var msg in unreadFromOthers)
                    {
                        msg.IsRead = true;
                        msg.ReadAt = now;
                        msg.ReadBy = userName;
                        msg.IsDelivered = true;
                        msg.DeliveredAt ??= now;
                        readIds.Add(msg.Id);
                    }

                    await _context.SaveChangesAsync();

                    // Notify group members that their sent messages have been read
                    await Clients.Group(groupName).SendAsync("MessagesReadUpdate", new
                    {
                        messageIds = readIds,
                        readBy = userName,
                        groupName
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark unread messages as read upon join for {GroupName}", groupName);
            }

            // 3. Fetch last 50 historical messages with status from SQL Server
            try
            {
                var history = await _context.ChatMessages
                    .AsNoTracking()
                    .Where(m => m.GroupName == groupName)
                    .OrderByDescending(m => m.SentAt)
                    .Take(50)
                    .OrderBy(m => m.SentAt)
                    .Select(m => new
                    {
                        id = m.Id,
                        user = m.SenderName,
                        message = m.Message,
                        isSystem = m.IsSystem,
                        time = m.SentAt.ToLocalTime().ToString("hh:mm tt"),
                        isDelivered = m.IsDelivered,
                        isRead = m.IsRead,
                        readBy = m.ReadBy
                    })
                    .ToListAsync();

                await Clients.Caller.SendAsync("LoadMessageHistory", history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load chat history for group: {GroupName}", groupName);
            }

            // 4. Notify group that user has joined
            await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", new
            {
                id = 0,
                user = "System",
                message = $"{userName} has joined #{groupName}",
                time = DateTime.Now.ToString("hh:mm tt"),
                isSystem = true,
                isDelivered = true,
                isRead = true
            });
        }

        public async Task LeaveGroup(UserGroupConnection userConnection)
        {
            if (userConnection == null || string.IsNullOrWhiteSpace(userConnection.GroupName))
                return;

            var groupName = userConnection.GroupName.Trim();
            var userName = string.IsNullOrWhiteSpace(userConnection.UserID) ? "Staff Member" : userConnection.UserID.Trim();

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

            await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", new
            {
                id = 0,
                user = "System",
                message = $"{userName} has left #{groupName}",
                time = DateTime.Now.ToString("hh:mm tt"),
                isSystem = true,
                isDelivered = true,
                isRead = true
            });
        }

        public async Task SendMessageToGroup(string groupName, string userId, string message)
        {
            if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(message))
                return;

            var cleanGroup = groupName.Trim();
            var cleanUser = string.IsNullOrWhiteSpace(userId) ? "Staff" : userId.Trim();
            var cleanText = message.Trim();

            // 1. FIRST: Save to SQL Server Database as "Sent" (not delivered or read yet)
            var chatEntity = new ChatMessage
            {
                GroupName = cleanGroup,
                SenderName = cleanUser,
                Message = cleanText,
                SentAt = DateTime.UtcNow,
                IsSystem = false,
                IsDelivered = false,
                IsRead = false
            };

            try
            {
                _context.ChatMessages.Add(chatEntity);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist chat message to database for group: {GroupName}", cleanGroup);
                throw new HubException("Failed to save message to database. Please try again.");
            }

            // 2. SECOND: Broadcast via SignalR with Id & Status
            var formattedTime = chatEntity.SentAt.ToLocalTime().ToString("hh:mm tt");
            await Clients.Group(cleanGroup).SendAsync("ReceiveGroupMessage", new
            {
                id = chatEntity.Id,
                user = chatEntity.SenderName,
                message = chatEntity.Message,
                time = formattedTime,
                isSystem = false,
                isDelivered = false,
                isRead = false,
                readBy = (string?)null
            });
        }

        public async Task MarkMessageAsDelivered(int messageId)
        {
            if (messageId <= 0) return;

            try
            {
                var msg = await _context.ChatMessages.FindAsync(messageId);
                if (msg != null && !msg.IsDelivered)
                {
                    msg.IsDelivered = true;
                    msg.DeliveredAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    // Notify group members that message has been delivered
                    await Clients.Group(msg.GroupName).SendAsync("MessageDeliveredUpdate", messageId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark message {MessageId} as delivered", messageId);
            }
        }

        public async Task MarkMessageAsRead(int messageId, string readerName)
        {
            if (messageId <= 0 || string.IsNullOrWhiteSpace(readerName)) return;

            var cleanReader = readerName.Trim();
            try
            {
                var msg = await _context.ChatMessages.FindAsync(messageId);
                if (msg != null && !msg.IsRead && msg.SenderName != cleanReader)
                {
                    var now = DateTime.UtcNow;
                    msg.IsRead = true;
                    msg.ReadAt = now;
                    msg.ReadBy = cleanReader;
                    msg.IsDelivered = true;
                    msg.DeliveredAt ??= now;

                    await _context.SaveChangesAsync();

                    // Broadcast to group so sender's UI updates to Blue Ticks immediately in real-time
                    await Clients.Group(msg.GroupName).SendAsync("MessagesReadUpdate", new
                    {
                        messageIds = new List<int> { msg.Id },
                        readBy = cleanReader,
                        groupName = msg.GroupName
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark message {MessageId} as read by {ReaderName}", messageId, cleanReader);
            }
        }

        public async Task MarkMessagesAsRead(string groupName, string readerName)
        {
            if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(readerName))
                return;

            var cleanGroup = groupName.Trim();
            var cleanReader = readerName.Trim();

            try
            {
                var unreadMessages = await _context.ChatMessages
                    .Where(m => m.GroupName == cleanGroup && !m.IsRead && m.SenderName != cleanReader)
                    .ToListAsync();

                if (unreadMessages.Count > 0)
                {
                    var now = DateTime.UtcNow;
                    var readIds = new List<int>();

                    foreach (var msg in unreadMessages)
                    {
                        msg.IsRead = true;
                        msg.ReadAt = now;
                        msg.ReadBy = cleanReader;
                        msg.IsDelivered = true;
                        msg.DeliveredAt ??= now;
                        readIds.Add(msg.Id);
                    }

                    await _context.SaveChangesAsync();

                    await Clients.Group(cleanGroup).SendAsync("MessagesReadUpdate", new
                    {
                        messageIds = readIds,
                        readBy = cleanReader,
                        groupName = cleanGroup
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark messages as read for {GroupName} by {ReaderName}", cleanGroup, cleanReader);
            }
        }
    }
}
