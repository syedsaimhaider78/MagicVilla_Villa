import { Injectable, signal, computed } from '@angular/core';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // 1. Writable Signal: Holds the array of notifications
  private notificationsSignal = signal<AppNotification[]>([]);

  // Public readonly exposure
  readonly notifications = this.notificationsSignal.asReadonly();

  // 2. Computed Signal: Automatically updates whenever notifications change
  readonly unreadCount = computed(() => 
    this.notificationsSignal().filter(n => !n.read).length
  );

  // Add notification
  show(title: string, message: string, type: 'success' | 'error' | 'info' = 'info', autoDismiss = true) {
    const id = crypto.randomUUID();
    const newNotification: AppNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    // Update signal state
    this.notificationsSignal.update(current => [newNotification, ...current]);

    // Optional auto-dismiss after 5 seconds
    if (autoDismiss) {
      setTimeout(() => this.dismiss(id), 5000);
    }
  }

  markAllAsRead() {
    this.notificationsSignal.update(current =>
      current.map(n => ({ ...n, read: true }))
    );
  }

  dismiss(id: string) {
    this.notificationsSignal.update(current => current.filter(n => n.id !== id));
  }
}