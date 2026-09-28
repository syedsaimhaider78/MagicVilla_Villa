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

  // Booking Modal & Verification Form fields
  showBookingModal = false;
  customerName = '';
  customerEmail = '';
  purposeOfVisit = 'Holidays';
  purposeOptions = ['Holidays', 'Family Stay', 'Party & Celebration', 'Business & Corporate', 'Other'];
  selectedFile: File | null = null;
  filePreview: string | null = null;
  fileError = '';

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

  openBookingModal(): void {
    if (!this.auth.isLoggedIn()) {
      this.toast.error('Please sign in to proceed with booking.');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.villa || !this.nights) {
      this.toast.error('Select a valid check-in and check-out date.');
      return;
    }

    const user = this.auth.getUser();
    this.customerName = user?.name || '';
    this.customerEmail = user?.email || '';
    this.purposeOfVisit = 'Holidays';
    this.selectedFile = null;
    this.filePreview = null;
    this.fileError = '';
    this.bookingError = '';
    this.showBookingModal = true;
    this.cdr.detectChanges();
  }

  closeBookingModal(): void {
    if (this.booking) return;
    this.showBookingModal = false;
    this.cdr.detectChanges();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB

    if (file.size > maxSizeBytes) {
      this.fileError = `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 2MB limit. Please upload a smaller file.`;
      this.selectedFile = null;
      this.filePreview = null;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.fileError = '';
    this.selectedFile = file;

    // Generate preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.filePreview = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreview = null;
    }

    this.cdr.detectChanges();
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
    this.fileError = '';
    this.cdr.detectChanges();
  }

  getFileSizeDisplay(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  submitBooking(): void {
    if (!this.villa || !this.nights) {
      this.toast.error('Select a valid check-in and check-out date.');
      return;
    }

    if (!this.customerName.trim()) {
      this.fileError = 'Guest name is required.';
      return;
    }

    if (!this.customerEmail.trim()) {
      this.fileError = 'Guest email is required.';
      return;
    }

    if (!this.purposeOfVisit) {
      this.fileError = 'Please specify the purpose of your visit.';
      return;
    }

    this.booking = true;
    this.bookingError = '';
    this.fileError = '';

    const formData = new FormData();
    formData.append('villaId', String(this.villa.id));
    formData.append('customerName', this.customerName.trim());
    formData.append('customerEmail', this.customerEmail.trim());
    formData.append('checkInDate', this.checkIn);
    formData.append('checkOutDate', this.checkOut);
    formData.append('purposeOfVisit', this.purposeOfVisit);

    if (this.selectedFile) {
      formData.append('document', this.selectedFile, this.selectedFile.name);
    }

    this.bookings.create(formData).subscribe({
      next: () => {
        this.booking = false;
        this.booked = true;
        this.showBookingModal = false;
        this.bookingError = '';
        this.toast.success('Your booking request has been submitted for admin approval!');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.booking = false;
        const msg = err?.error?.message || err?.message || 'Could not submit reservation request.';
        this.bookingError = msg;
        this.fileError = msg;
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/villas']);
  }
}
