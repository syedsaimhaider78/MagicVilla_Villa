import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isLoggedIn()) {
    toast.error('Please sign in to access the administrator panel.');
    router.navigate(['/login']);
    return false;
  }

  if (!auth.isAdmin()) {
    toast.error('Access denied. Administrator privileges are required.');
    router.navigate(['/']);
    return false;
  }

  return true;
};
