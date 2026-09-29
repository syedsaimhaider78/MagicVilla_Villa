import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guards';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./components/home/home').then(m => m.HomeComponent) 
  },
  { 
    path: 'villas', 
    loadComponent: () => import('./components/villa-list/villa-list').then(m => m.VillaListComponent) 
  },
  { 
    path: 'admin/dashboard', 
    loadComponent: () => import('./components/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent), 
    canActivate: [adminGuard] 
  },
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { 
    path: 'villa-create', 
    loadComponent: () => import('./components/villa-create/villa-create').then(m => m.VillaCreateComponent), 
    canActivate: [adminGuard] 
  },
  { 
    path: 'details/:id', 
    loadComponent: () => import('./components/villa-details/villa-details').then(m => m.VillaDetailsComponent) 
  },
  { 
    path: 'villa-edit/:id', 
    loadComponent: () => import('./components/villa-edit/villa-edit').then(m => m.VillaEditComponent), 
    canActivate: [adminGuard] 
  },
  { 
    path: 'bookings', 
    loadComponent: () => import('./components/bookings/bookings').then(m => m.BookingsComponent), 
    canActivate: [authGuard] 
  },
  { 
    path: 'staff-chat', 
    loadComponent: () => import('./components/staff-chat/staff-chat').then(m => m.StaffChatComponent) 
  },
  { path: 'chat', redirectTo: 'staff-chat', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./components/auth/register/login/login').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./components/auth/register/register').then(m => m.RegisterComponent) 
  },
  { path: '**', redirectTo: '' }
];
