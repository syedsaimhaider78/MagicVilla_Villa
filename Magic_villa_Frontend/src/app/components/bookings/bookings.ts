import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Booking, BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bookings.html',
  styleUrl: './bookings.scss'
})
export class BookingsComponent implements OnInit {
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  selectedFilter: string = 'All';
  filterOptions: string[] = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];
  loading = true;
  errorMessage = '';
  updatingId?: number;

  // Document & Details Review Modal
  reviewBooking: Booking | null = null;

  constructor(
    private readonly bookingService: BookingService,
    public readonly auth: AuthService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

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
        this.applyFilter();
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

  setFilter(filter: string): void {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.selectedFilter === 'All') {
      this.filteredBookings = [...this.bookings];
    } else if (this.selectedFilter === 'Approved') {
      this.filteredBookings = this.bookings.filter(b => b.status === 'Approved' || b.status === 'Confirmed');
    } else if (this.selectedFilter === 'Rejected') {
      this.filteredBookings = this.bookings.filter(b => b.status === 'Rejected' || b.status === 'Cancelled');
    } else {
      this.filteredBookings = this.bookings.filter(b => b.status === this.selectedFilter);
    }
  }

  update(booking: Booking, status: Booking['status']): void {
    this.updatingId = booking.id;
    this.bookingService.updateStatus(booking, status).subscribe({
      next: () => {
        booking.status = status;
        this.updatingId = undefined;
        this.toast.success(`Reservation #${booking.id} updated to ${status}.`);
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: () => {
        this.updatingId = undefined;
        this.toast.error('Failed to update reservation.');
        this.cdr.detectChanges();
      }
    });
  }

  approve(booking: Booking): void {
    this.updatingId = booking.id;
    this.bookingService.approveBooking(booking.id).subscribe({
      next: () => {
        booking.status = 'Approved';
        this.updatingId = undefined;
        if (this.reviewBooking?.id === booking.id) {
          this.reviewBooking.status = 'Approved';
        }
        this.toast.success(`Booking #${booking.id} approved successfully.`);
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.updatingId = undefined;
        const msg = err?.error?.message || 'Failed to approve booking.';
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  reject(booking: Booking): void {
    this.updatingId = booking.id;
    this.bookingService.rejectBooking(booking.id).subscribe({
      next: () => {
        booking.status = 'Rejected';
        this.updatingId = undefined;
        if (this.reviewBooking?.id === booking.id) {
          this.reviewBooking.status = 'Rejected';
        }
        this.toast.success(`Booking #${booking.id} has been rejected.`);
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.updatingId = undefined;
        const msg = err?.error?.message || 'Failed to reject booking.';
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  openReview(booking: Booking): void {
    this.reviewBooking = booking;
    this.cdr.detectChanges();
  }

  closeReview(): void {
    this.reviewBooking = null;
    this.cdr.detectChanges();
  }

  getDocumentUrl(relativePath?: string): string {
    return this.bookingService.getDocumentUrl(relativePath);
  }

  isImageDocument(url?: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
  }

  isPdfDocument(url?: string): boolean {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }
}
