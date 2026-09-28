import { Injectable, signal, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: string;
  read: boolean;
  bookingId?: number;
  link?: string;
}

const STORAGE_KEY = 'mv_notifications_history';
const MAX_HISTORY = 60;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toast = inject(ToastService);

  // 1. Writable Signal initialized with persistent history
  private notificationsSignal = signal<AppNotification[]>(this.loadFromStorage());

  // Public readonly exposure
  readonly notifications = this.notificationsSignal.asReadonly();

  // 2. Computed Signal: Automatically updates count of unread notifications
  readonly unreadCount = computed(() => 
    this.notificationsSignal().filter(n => !n.read).length
  );

  private loadFromStorage(): AppNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            ...item,
            timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date(item.timestamp).toISOString()
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load notifications from storage:', e);
    }
    return [];
  }

  private saveToStorage(notifications: AppNotification[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_HISTORY)));
    } catch (e) {
      console.error('Failed to persist notifications:', e);
    }
  }

  /**
   * Add notification to persistent history and display an on-screen toast popup.
   * Does NOT wipe or delete the notification from history.
   */
  show(
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'info' = 'info', 
    showPopupToast = true,
    meta?: { bookingId?: number; link?: string }
  ) {
    const id = crypto.randomUUID();
    const newNotification: AppNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      bookingId: meta?.bookingId,
      link: meta?.link
    };

    // Update signal state and persist into localStorage
    this.notificationsSignal.update(current => {
      const updated = [newNotification, ...current].slice(0, MAX_HISTORY);
      this.saveToStorage(updated);
      return updated;
    });

    // Display real-time toast alert without removing notification from history
    if (showPopupToast) {
      const toastType = type === 'error' ? 'error' : 'success';
      this.toast.show(`${title}: ${message}`, toastType, 6000);
    }
  }

  markAsRead(id: string) {
    this.notificationsSignal.update(current => {
      const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
      this.saveToStorage(updated);
      return updated;
    });
  }

  markAllAsRead() {
    this.notificationsSignal.update(current => {
      const updated = current.map(n => ({ ...n, read: true }));
      this.saveToStorage(updated);
      return updated;
    });
  }

  dismiss(id: string) {
    this.notificationsSignal.update(current => {
      const updated = current.filter(n => n.id !== id);
      this.saveToStorage(updated);
      return updated;
    });
  }

  clearAll() {
    this.notificationsSignal.set([]);
    this.saveToStorage([]);
  }
}