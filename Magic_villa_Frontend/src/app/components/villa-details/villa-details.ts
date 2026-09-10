import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Villa } from '../../models/villa.model';
import { VillaService } from '../../services/villa.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-villa-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './villa-details.html',
  styleUrl: './villa-details.scss'
})
export class VillaDetailsComponent implements OnInit {
  villa?: Villa;
  loading = true;
  errorMessage = '';
  bookingError = '';
  checkIn = '';
  checkOut = '';
  booking = false;
  booked = false;
  today = new Date().toISOString().slice(0, 10);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly villas: VillaService,
    private readonly bookings: BookingService,
    public readonly auth: AuthService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadVilla();
  }

  loadVilla(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.loading = false;
      this.errorMessage = 'Invalid villa ID.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.villas.getVillaById(id).subscribe({
      next: (v: any) => {
        this.villa = v?.result || v?.data || v;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load villa details.';
        this.loading = false;
        this.toast.error(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  get nights(): number {
    return this.checkIn && this.checkOut
      ? Math.max(0, Math.round((new Date(this.checkOut).getTime() - new Date(this.checkIn).getTime()) / 86400000))
      : 0;
  }

  get total(): number {
    return this.nights * (this.villa?.price || 0);
  }

  onDatesChange(): void {
    if (this.bookingError) {
      this.bookingError = '';
      this.cdr.detectChanges();
    }
  }

  reserve(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.villa || !this.nights) {
      this.toast.error('Select a valid check-in and check-out date.');
      return;
    }

    this.booking = true;
    this.bookingError = '';

    this.bookings.create({
      villaId: this.villa.id,
      checkInDate: this.checkIn,
      checkOutDate: this.checkOut
    }).subscribe({
      next: () => {
        this.booking = false;
        this.booked = true;
        this.bookingError = '';
        this.toast.success('Reservation confirmed.');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.booking = false;
        const msg = err?.error?.message || err?.message || 'Could not create reservation.';
        this.bookingError = msg;
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/villas']);
  }
}
