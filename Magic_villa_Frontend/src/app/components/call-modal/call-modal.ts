import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CallService, OnlineCallUser } from '../../services/call.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './call-modal.html',
  styleUrl: './call-modal.scss'
})
export class CallModalComponent {
  public callService = inject(CallService);
  public auth = inject(AuthService);

  public searchTerm = signal<string>('');
  public isRefreshing = signal<boolean>(false);

  public isStaffOrAdmin(): boolean {
    return this.auth.isAdmin() || this.auth.isStaff();
  }

  public async refreshUsers(): Promise<void> {
    this.isRefreshing.set(true);
    await this.callService.requestOnlineUsers();
    setTimeout(() => {
      this.isRefreshing.set(false);
    }, 400);
  }

  public getAvailableContacts(): OnlineCallUser[] {
    const myName = (this.callService.myUserName() || this.auth.getUser()?.name || '').trim().toLowerCase();
    const myId = (this.callService.myUserId() || this.auth.getUserId() || '').trim().toLowerCase();
    const isStaffAdmin = this.isStaffOrAdmin();
    const search = this.searchTerm().trim().toLowerCase();

    return this.callService.onlineUsers().filter(u => {
      const uName = (u.userName || '').trim().toLowerCase();
      const uId = (u.userId || '').trim().toLowerCase();
      const role = (u.role || '').toLowerCase();

      // Don't show myself
      if (uName && uName === myName) return false;
      if (uId && (uId === myId || uId === myName)) return false;

      // Filter by role permissions:
      // Staff and Admin can see EVERYONE (Admin, Staff, Customer, Client, Guest)
      if (!isStaffAdmin) {
        // Normal Client/Guest sees Admin and Staff
        if (role !== 'admin' && role !== 'staff') {
          return false;
        }
      }

      // Filter by search query if typed
      if (search) {
        const matchesName = uName.includes(search);
        const matchesId = uId.includes(search);
        const matchesRole = role.includes(search);
        if (!matchesName && !matchesId && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }

  public getRoleBadgeClass(role: string): string {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'badge-admin';
    if (r === 'staff') return 'badge-staff';
    return 'badge-client';
  }

  public callContact(contact: OnlineCallUser): void {
    if (contact.isBusy) return;
    this.callService.showContactsModal.set(false);
    this.callService.callUser(contact.userId, contact.userName, contact.role);
  }

  public callAdminDirectly(): void {
    this.callService.showContactsModal.set(false);
    // Find online admin
    const onlineAdmin = this.callService.onlineUsers().find(u => u.role.toLowerCase() === 'admin');
    if (onlineAdmin) {
      this.callService.callUser(onlineAdmin.userId, onlineAdmin.userName, 'Admin');
    } else {
      // Attempt call to default admin identifier
      this.callService.callUser('1', 'System Admin', 'Admin');
    }
  }
}
