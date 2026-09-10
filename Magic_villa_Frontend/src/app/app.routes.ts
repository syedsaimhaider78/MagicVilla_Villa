import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { VillaListComponent } from './components/villa-list/villa-list';
import { VillaCreateComponent } from './components/villa-create/villa-create';
import { VillaDetailsComponent } from './components/villa-details/villa-details';
import { VillaEditComponent } from './components/villa-edit/villa-edit';
import { LoginComponent } from './components/auth/register/login/login';
import { RegisterComponent } from './components/auth/register/register';
import { BookingsComponent } from './components/bookings/bookings';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard';
import { authGuard } from './guards/auth.guards';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'villas', component: VillaListComponent },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'villa-create', component: VillaCreateComponent, canActivate: [adminGuard] },
  { path: 'details/:id', component: VillaDetailsComponent },
  { path: 'villa-edit/:id', component: VillaEditComponent, canActivate: [adminGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: '' }
];
