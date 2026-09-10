import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
export type ToastType = 'success' | 'error';
export interface Toast { id: number; message: string; type: ToastType; }
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly subject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.subject.asObservable();
  show(message: string, type: ToastType = 'success', duration = 4000): void {
    const toast = { id: Date.now(), message, type };
    this.subject.next([...this.subject.value, toast]);
    window.setTimeout(() => this.dismiss(toast.id), duration);
  }
  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 5500); }
  dismiss(id: number): void { this.subject.next(this.subject.value.filter(t => t.id !== id)); }
}
