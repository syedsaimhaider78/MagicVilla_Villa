import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';

export interface ChatMessage {
  id?: number;
  user: string;
  message: string;
  time?: string;
  isSystem?: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  readBy?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubConnection!: signalR.HubConnection;

  public messages = signal<ChatMessage[]>([]);
  public isConnected = signal<boolean>(false);
  public currentUserName = signal<string>('');
  public isRoomActive = signal<boolean>(false);

  public async startConnection(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:44373/Chat', {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.registerMessageListener();

    try {
      await this.hubConnection.start();
      console.log('SignalR Chat Connected Successfully!');
      this.isConnected.set(true);

      this.hubConnection.onreconnected(() => {
        this.isConnected.set(true);
      });

      this.hubConnection.onclose(() => {
        this.isConnected.set(false);
      });
    } catch (err) {
      console.error('Error connecting to ChatHub:', err);
      this.isConnected.set(false);
    }
  }

  private registerMessageListener(): void {
    // 1. Receive newly broadcasted message
    this.hubConnection.on('ReceiveGroupMessage', (data: any, legacyMsg?: string, legacyTime?: string) => {
      let msg: ChatMessage;
      if (typeof data === 'object' && data !== null && 'message' in data) {
        msg = {
          id: data.id,
          user: data.user,
          message: data.message,
          time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: data.isSystem,
          isDelivered: data.isDelivered,
          isRead: data.isRead,
          readBy: data.readBy
        };
      } else {
        msg = {
          user: data,
          message: legacyMsg || '',
          time: legacyTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: data === 'System'
        };
      }

      this.messages.update(prev => [...prev, msg]);

      // If message is from someone else:
      if (msg.id && !msg.isSystem && msg.user !== this.currentUserName()) {
        const isTabFocused = typeof document !== 'undefined' && document.visibilityState === 'visible';

        if (this.isRoomActive() && isTabFocused) {
          // Recipient is actively viewing the chat room right now -> Mark as Seen / Read immediately!
          this.markMessageAsRead(msg.id, this.currentUserName());
        } else {
          // Recipient has window minimized or another tab open -> Mark as Delivered (Double grey ticks)
          this.markMessageAsDelivered(msg.id);
        }
      }
    });

    // 2. Receive historical messages from SQL Server database upon joining channel
    this.hubConnection.on('LoadMessageHistory', (history: ChatMessage[]) => {
      if (Array.isArray(history)) {
        this.messages.set(history);
      }
    });

    // 3. Message delivered update (Single tick -> Double grey tick)
    this.hubConnection.on('MessageDeliveredUpdate', (messageId: number) => {
      this.messages.update(prev =>
        prev.map(m => m.id === messageId ? { ...m, isDelivered: true } : m)
      );
    });

    // 4. Messages read update (Double grey tick -> Double blue tick)
    this.hubConnection.on('MessagesReadUpdate', (payload: { messageIds: number[], readBy: string, groupName: string }) => {
      if (!payload || !payload.messageIds) return;
      const ids = new Set(payload.messageIds);
      this.messages.update(prev =>
        prev.map(m => (m.id && ids.has(m.id)) ? { ...m, isRead: true, isDelivered: true, readBy: payload.readBy } : m)
      );
    });
  }

  public async joinGroup(userId: string, groupName: string): Promise<void> {
    this.currentUserName.set(userId);
    this.isRoomActive.set(true);

    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      await this.startConnection();
    }

    await this.hubConnection.invoke('JoinGroup', {
      userId: userId,
      groupName: groupName
    });
  }

  public async leaveGroup(userId: string, groupName: string): Promise<void> {
    this.isRoomActive.set(false);

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('LeaveGroup', {
        userId: userId,
        groupName: groupName
      });
    }
  }

  public async sendMessage(groupName: string, userId: string, message: string): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      await this.startConnection();
    }

    await this.hubConnection.invoke('SendMessageToGroup', groupName, userId, message);
  }

  public async markMessageAsDelivered(messageId: number): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('MarkMessageAsDelivered', messageId);
      } catch (err) {
        console.warn('Failed to mark message as delivered:', err);
      }
    }
  }

  public async markMessageAsRead(messageId: number, readerName: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('MarkMessageAsRead', messageId, readerName);
      } catch (err) {
        console.warn('Failed to mark single message as read:', err);
      }
    }
  }

  public async markMessagesAsRead(groupName: string, readerName: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('MarkMessagesAsRead', groupName, readerName);
      } catch (err) {
        console.warn('Failed to mark messages as read:', err);
      }
    }
  }

  public clearMessages(): void {
    this.messages.set([]);
  }
}