import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };

  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (user: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (this.authService.isAdmin() || (user && user.role === 'Admin')) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid email or password. Please try again.';
        this.cdr.detectChanges(); // UI ko foran unfreeze karega aur error show karega
      }
    });
  }
}