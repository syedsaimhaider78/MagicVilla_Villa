import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocialAuthService, GoogleSigninButtonModule, SocialUser } from '@abacritt/angularx-social-login';
import { AuthService, UserResponse } from '../../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  credentials = {
    email: '',
    password: ''
  };

  loading: boolean = false;
  errorMessage: string = '';
  private authSubscription?: Subscription;
  private lastHandledToken: string | null = null;

  constructor(
    private authService: AuthService,
    private socialAuthService: SocialAuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.socialAuthService.authState.subscribe({
      next: (user: SocialUser | null) => {
        if (user && user.idToken && user.idToken !== this.lastHandledToken) {
          this.lastHandledToken = user.idToken;
          this.handleGoogleLogin(user.idToken);
        }
      },
      error: (err) => {
        console.error('Google Social Auth error:', err);
        this.errorMessage = 'Google authentication initialization failed.';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  onSubmit(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (user: UserResponse) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.navigateAfterLogin(user);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid email or password. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private handleGoogleLogin(idToken: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.googleLogin(idToken).subscribe({
      next: (user: UserResponse) => {
        this.loading = false;
        if (user?.token) {
          localStorage.setItem('token', user.token);
        }
        this.cdr.detectChanges();
        this.navigateAfterLogin(user);
      },
      error: (err: any) => {
        this.loading = false;
        this.lastHandledToken = null; // Allow retry on failure
        this.errorMessage = err.error?.message || 'Google sign-in failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private navigateAfterLogin(user?: UserResponse): void {
    if (this.authService.isAdmin() || (user && user.role === 'Admin')) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }
}