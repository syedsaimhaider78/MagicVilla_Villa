import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Booking, BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-bookings', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './bookings.html', styleUrl: './bookings.scss' })
export class BookingsComponent implements OnInit {
  bookings: Booking[] = [];
  loading = true;
  errorMessage = '';
  updatingId?: number;

  constructor(private readonly bookingService: BookingService, public readonly auth: AuthService, private readonly toast: ToastService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadBookings(); }

  loadBookings(): void {
    const user = this.auth.getUser();
    this.loading = true;
    this.errorMessage = '';
    this.bookings = [];

    if (!user) {
      this.loading = false;
      this.errorMessage = 'Please sign in to view your reservations.';
      this.cdr.detectChanges();
      return;
    }

    const request = user.role === 'Admin' ? this.bookingService.getAllBookings() : this.bookingService.getMyBookings();
    request.subscribe({
      next: bookings => {
        this.bookings = Array.isArray(bookings) ? bookings : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to fetch reservations. Please ensure the backend is running and try again.';
        this.toast.error(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  update(booking: Booking, status: Booking['status']): void {
    this.updatingId = booking.id;
    this.bookingService.updateStatus(booking, status).subscribe({
      next: () => { booking.status = status; this.updatingId = undefined; this.toast.success('Reservation status updated.'); this.cdr.detectChanges(); },
      error: () => { this.updatingId = undefined; this.toast.error('Failed to update reservation.'); this.cdr.detectChanges(); }
    });
  }
}
