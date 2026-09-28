import { Component, inject, signal, Renderer2, ElementRef, HostListener } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { CallService } from '../../services/call.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  public auth = inject(AuthService);
  public notificationService = inject(NotificationService);
  public callService = inject(CallService);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private elementRef = inject(ElementRef);

  isDarkMode = false;
  isDropdownOpen = signal(false);

  constructor() {
    this.isDarkMode = localStorage.getItem('dark-mode') === 'true';
    this.applyTheme();
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('dark-mode', String(this.isDarkMode));
    this.applyTheme();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  toggleDropdown() {
    this.isDropdownOpen.update(open => !open);
  }

  closeDropdown() {
    this.isDropdownOpen.set(false);
  }

  handleNotificationClick(item: AppNotification) {
    this.notificationService.markAsRead(item.id);
    if (item.link) {
      this.router.navigateByUrl(item.link);
      this.closeDropdown();
    } else if (item.bookingId) {
      this.router.navigate(['/bookings']);
      this.closeDropdown();
    }
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isDropdownOpen() && !this.elementRef.nativeElement.querySelector('.notif-wrapper')?.contains(target)) {
      this.closeDropdown();
    }
  }

  private applyTheme() {
    this.renderer[this.isDarkMode ? 'addClass' : 'removeClass'](this.document.body, 'dark-mode');
  }
}