import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  user = {
    name: '',
    email: '',
    password: '',
    role: 'Customer'
  };

  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.user).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Account created successfully! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to register. Please check your inputs.';
      }
    });
  }
}