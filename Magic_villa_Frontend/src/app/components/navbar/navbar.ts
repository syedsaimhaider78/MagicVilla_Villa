import { Component, inject, signal, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
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

  private applyTheme() {
    this.renderer[this.isDarkMode ? 'addClass' : 'removeClass'](this.document.body, 'dark-mode');
  }
}