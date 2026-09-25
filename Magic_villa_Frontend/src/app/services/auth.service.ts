import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface UserResponse {
  id?: number;
  token: string;
  name: string;
  email: string;
  role: 'Admin' | 'Customer' | 'Client' | string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://localhost:44373/api/AuthApi';
  private currentUserSubject = new BehaviorSubject<UserResponse | null>(this.getUserFromStorage());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(data: { name: string; email: string; password: string; role: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(credentials: { email: string; password: string }): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(user => {
        localStorage.setItem('mv_user', JSON.stringify(user));
        if (user?.token) {
          localStorage.setItem('token', user.token);
        }
        this.currentUserSubject.next(user);
      })
    );
  }

  googleLogin(idToken: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/google-login`, { idToken }).pipe(
      tap(user => {
        localStorage.setItem('mv_user', JSON.stringify(user));
        if (user?.token) {
          localStorage.setItem('token', user.token);
        }
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('mv_user');
    this.currentUserSubject.next(null);
  }

  getUser(): UserResponse | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getUser()?.token;
  }

  decodeToken(token?: string): Record<string, any> | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    const user = this.getUser();
    if (user?.role) {
      return user.role;
    }
    if (user?.token) {
      const decoded = this.decodeToken(user.token);
      const role =
        decoded?.['role'] ||
        decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        decoded?.['Role'];
      if (role) {
        return role;
      }
    }
    return null;
  }

  isAdmin(): boolean {
    const user = this.getUser();
    if (!user) return false;

    // Check user profile object
    if (user.role && user.role.toLowerCase() === 'admin') {
      return true;
    }

    // Decode token to verify role claim
    if (user.token) {
      const decoded = this.decodeToken(user.token);
      const role =
        decoded?.['role'] ||
        decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        decoded?.['Role'];
      return typeof role === 'string' && role.toLowerCase() === 'admin';
    }

    return false;
  }

  getUserId(): string {
    const user = this.getUser();
    if (user?.id) {
      return String(user.id);
    }
    if (user?.token) {
      const decoded = this.decodeToken(user.token);
      const id =
        decoded?.['nameid'] ||
        decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
        decoded?.['sub'] ||
        decoded?.['id'];
      if (id) {
        return String(id);
      }
    }
    if (user?.name) {
      return user.name;
    }
    return '';
  }

  isStaff(): boolean {
    const user = this.getUser();
    if (!user) return false;
    const role = (this.getRole() || user.role || '').toLowerCase();
    return role === 'staff' || role === 'admin';
  }

  private getUserFromStorage(): UserResponse | null {
    try {
      const value = localStorage.getItem('mv_user');
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }
}
