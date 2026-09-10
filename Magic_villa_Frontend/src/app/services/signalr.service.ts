import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { NotificationService } from './notification.service';

export interface BookingNotificationPayload {
  title: string;
  message: string;
  timestamp?: string;
  bookingId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private notificationService = inject(NotificationService);
  private hubConnection?: signalR.HubConnection;

  public startConnection(): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:44373/hubs/notifications')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('[SignalR] Successfully connected to Notification Hub');
      })
      .catch((err: unknown) => {
        console.error('[SignalR] Error establishing connection:', err);
      });

    this.registerNotificationListeners();
  }

  private registerNotificationListeners(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveBookingNotification', (data: BookingNotificationPayload) => {
      console.log('[SignalR] Received booking notification:', data);
      this.notificationService.show(
        data.title || 'New Booking Confirmed!',
        data.message || 'A new reservation has been processed.',
        'success'
      );
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
