using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace MagicVilla_VillaAPI.Hubs
{
    public class UserCallSession
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Role { get; set; } = "Client"; // "Admin", "Staff", "Client"
        public bool IsBusy { get; set; } = false;
        public string? ActiveCallWithUserId { get; set; }
    }

    public class CallHub : Hub
    {
        // Thread-safe dictionary: ConnectionId -> UserCallSession
        private static readonly ConcurrentDictionary<string, UserCallSession> ConnectedUsers = new();
        private readonly ILogger<CallHub> _logger;

        public CallHub(ILogger<CallHub> logger)
        {
            _logger = logger;
        }

        public async Task RegisterUser(string userId, string userName, string role)
        {
            if (string.IsNullOrWhiteSpace(userId)) return;

            var cleanUserId = userId.Trim();
            var cleanUserName = string.IsNullOrWhiteSpace(userName) ? cleanUserId : userName.Trim();
            var cleanRole = string.IsNullOrWhiteSpace(role) ? "Client" : role.Trim();

            var session = new UserCallSession
            {
                ConnectionId = Context.ConnectionId,
                UserId = cleanUserId,
                UserName = cleanUserName,
                Role = cleanRole,
                IsBusy = false
            };

            ConnectedUsers[Context.ConnectionId] = session;
            _logger.LogInformation("Call user registered: {UserName} (ID: {UserId}), Role: {Role}, Conn: {ConnectionId}", 
                cleanUserName, cleanUserId, cleanRole, Context.ConnectionId);

            await BroadcastOnlineUsers();
        }

        public async Task InitiateCall(string targetUserId, object sdpOffer)
        {
            if (!ConnectedUsers.TryGetValue(Context.ConnectionId, out var callerSession))
            {
                await Clients.Caller.SendAsync("CallFailed", "Caller not registered. Please refresh.");
                return;
            }

            // Find target by either UserId or ConnectionId
            var targetKvp = ConnectedUsers.FirstOrDefault(u => 
                u.Value.UserId.Equals(targetUserId.Trim(), StringComparison.OrdinalIgnoreCase) ||
                u.Key.Equals(targetUserId.Trim(), StringComparison.OrdinalIgnoreCase));

            if (targetKvp.Value == null)
            {
                await Clients.Caller.SendAsync("CallFailed", $"User '{targetUserId}' is currently offline.");
                return;
            }

            var targetSession = targetKvp.Value;

            if (targetSession.ConnectionId == Context.ConnectionId)
            {
                await Clients.Caller.SendAsync("CallFailed", "You cannot call yourself.");
                return;
            }

            if (targetSession.IsBusy)
            {
                await Clients.Caller.SendAsync("CallBusy", $"{targetSession.UserName} is currently on another call.");
                return;
            }

            // Set busy flags
            callerSession.IsBusy = true;
            callerSession.ActiveCallWithUserId = targetSession.UserId;
            targetSession.IsBusy = true;
            targetSession.ActiveCallWithUserId = callerSession.UserId;

            _logger.LogInformation("Call initiated from {Caller} to {Target}", callerSession.UserName, targetSession.UserName);

            // Send incoming call alert to target recipient
            await Clients.Client(targetSession.ConnectionId).SendAsync(
                "IncomingCall",
                callerSession.UserId,
                callerSession.UserName,
                callerSession.Role,
                sdpOffer);

            await BroadcastOnlineUsers();
        }

        public async Task AcceptCall(string callerUserId, object sdpAnswer)
        {
            if (!ConnectedUsers.TryGetValue(Context.ConnectionId, out var receiverSession)) return;

            var callerKvp = ConnectedUsers.FirstOrDefault(u => 
                u.Value.UserId.Equals(callerUserId.Trim(), StringComparison.OrdinalIgnoreCase) ||
                u.Key.Equals(callerUserId.Trim(), StringComparison.OrdinalIgnoreCase));

            if (callerKvp.Value != null)
            {
                await Clients.Client(callerKvp.Value.ConnectionId).SendAsync(
                    "CallAccepted",
                    receiverSession.UserId,
                    receiverSession.UserName,
                    sdpAnswer);
            }
        }

        public async Task RejectCall(string callerUserId, string reason)
        {
            if (ConnectedUsers.TryGetValue(Context.ConnectionId, out var receiverSession))
            {
                receiverSession.IsBusy = false;
                receiverSession.ActiveCallWithUserId = null;
            }

            var callerKvp = ConnectedUsers.FirstOrDefault(u => 
                u.Value.UserId.Equals(callerUserId.Trim(), StringComparison.OrdinalIgnoreCase) ||
                u.Key.Equals(callerUserId.Trim(), StringComparison.OrdinalIgnoreCase));

            if (callerKvp.Value != null)
            {
                callerKvp.Value.IsBusy = false;
                callerKvp.Value.ActiveCallWithUserId = null;

                await Clients.Client(callerKvp.Value.ConnectionId).SendAsync("CallRejected", receiverSession?.UserId ?? "", reason ?? "Call declined");
            }

            await BroadcastOnlineUsers();
        }

        public async Task SendIceCandidate(string targetUserId, object candidate)
        {
            var targetKvp = ConnectedUsers.FirstOrDefault(u => 
                u.Value.UserId.Equals(targetUserId.Trim(), StringComparison.OrdinalIgnoreCase) ||
                u.Key.Equals(targetUserId.Trim(), StringComparison.OrdinalIgnoreCase));

            if (targetKvp.Value != null)
            {
                await Clients.Client(targetKvp.Value.ConnectionId).SendAsync("ReceiveIceCandidate", candidate);
            }
        }

        public async Task EndCall(string targetUserId)
        {
            if (ConnectedUsers.TryGetValue(Context.ConnectionId, out var currentSession))
            {
                currentSession.IsBusy = false;
                currentSession.ActiveCallWithUserId = null;
            }

            if (!string.IsNullOrWhiteSpace(targetUserId))
            {
                var targetKvp = ConnectedUsers.FirstOrDefault(u => 
                    u.Value.UserId.Equals(targetUserId.Trim(), StringComparison.OrdinalIgnoreCase) ||
                    u.Key.Equals(targetUserId.Trim(), StringComparison.OrdinalIgnoreCase));

                if (targetKvp.Value != null)
                {
                    targetKvp.Value.IsBusy = false;
                    targetKvp.Value.ActiveCallWithUserId = null;

                    await Clients.Client(targetKvp.Value.ConnectionId).SendAsync("CallEnded", currentSession?.UserId ?? "");
                }
            }

            await BroadcastOnlineUsers();
        }

        public async Task GetOnlineUsers()
        {
            var list = ConnectedUsers.Values.Select(u => new
            {
                userId = u.UserId,
                userName = u.UserName,
                role = u.Role,
                isBusy = u.IsBusy,
                connectionId = u.ConnectionId
            }).ToList();

            await Clients.Caller.SendAsync("OnlineUsersList", list);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (ConnectedUsers.TryRemove(Context.ConnectionId, out var session))
            {
                if (session.IsBusy && !string.IsNullOrWhiteSpace(session.ActiveCallWithUserId))
                {
                    var peerKvp = ConnectedUsers.FirstOrDefault(u => u.Value.UserId.Equals(session.ActiveCallWithUserId, StringComparison.OrdinalIgnoreCase));
                    if (peerKvp.Value != null)
                    {
                        peerKvp.Value.IsBusy = false;
                        peerKvp.Value.ActiveCallWithUserId = null;
                        await Clients.Client(peerKvp.Value.ConnectionId).SendAsync("CallEnded", session.UserId);
                    }
                }

                _logger.LogInformation("Call user disconnected: {UserName} ({UserId})", session.UserName, session.UserId);
                await BroadcastOnlineUsers();
            }

            await base.OnDisconnectedAsync(exception);
        }

        private async Task BroadcastOnlineUsers()
        {
            var list = ConnectedUsers.Values.Select(u => new
            {
                userId = u.UserId,
                userName = u.UserName,
                role = u.Role,
                isBusy = u.IsBusy,
                connectionId = u.ConnectionId
            }).ToList();

            await Clients.All.SendAsync("OnlineUsersUpdated", list);
        }
    }
}
