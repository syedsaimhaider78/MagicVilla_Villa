import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Villa } from '../../../models/villa.model';
import { VillaService } from '../../../services/villa.service';
import { BookingService } from '../../../services/booking.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit {
  villas: Villa[] = [];
  filteredVillas: Villa[] = [];
  searchTerm: string = '';
  selectedCategory: string = 'All';
  categories: string[] = ['All', 'Villa', 'HotelRoom', 'Apartment'];
  totalBookings: number = 0;
  loading: boolean = true;
  loadingMetrics: boolean = true;
  errorMessage: string = '';

  // Delete modal state
  pendingDelete: Villa | null = null;
  deleting: boolean = false;

  // Quick Create Modal state
  showCreateModal: boolean = false;
  submittingCreate: boolean = false;
  newVilla: Omit<Villa, 'id'> = {
    name: '',
    description: '',
    price: 0,
    sqft: 0,
    occupancy: 2,
    imageUrl: '',
    amenities: '',
    propertyType: 'Villa'
  };

  constructor(
    private readonly villaService: VillaService,
    private readonly bookingService: BookingService,
    public readonly auth: AuthService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadVillas();
    this.loadBookingMetrics();
  }

  loadVillas(): void {
    this.loading = true;
    this.errorMessage = '';

    this.villaService.getAllVillas().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.result || res?.data || [];
        this.villas = list;
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.villas = [];
        this.filteredVillas = [];
        this.loading = false;
        this.errorMessage = 'Unable to load villas. Please check your backend connection.';
        this.toast.error(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  loadBookingMetrics(): void {
    this.loadingMetrics = true;
    this.bookingService.getAllBookings().subscribe({
      next: (res: any) => {
        const bookings = Array.isArray(res) ? res : res?.result || res?.data || [];
        this.totalBookings = bookings.length;
        this.loadingMetrics = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalBookings = 0;
        this.loadingMetrics = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterByCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyFilter();
  }

  applyFilter(): void {
    let list = [...this.villas];

    if (this.selectedCategory && this.selectedCategory !== 'All') {
      const selected = this.selectedCategory.toLowerCase();
      list = list.filter(v => (v.propertyType || 'Villa').toLowerCase() === selected);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.amenities && v.amenities.toLowerCase().includes(q)) ||
        (v.propertyType && v.propertyType.toLowerCase().includes(q)) ||
        v.id.toString().includes(q)
      );
    }

    this.filteredVillas = list;
  }

  formatCategory(type?: string): string {
    if (!type) return 'Villa';
    if (type === 'HotelRoom') return 'Hotel Room';
    return type;
  }

  // Navigation actions
  navigateToCreate(): void {
    this.router.navigate(['/villa-create']);
  }

  editVilla(id: number): void {
    this.router.navigate(['/villa-edit', id]);
  }

  viewVilla(id: number): void {
    this.router.navigate(['/details', id]);
  }

  // Delete flow
  requestDelete(villa: Villa): void {
    this.pendingDelete = villa;
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    this.deleting = true;
    const villaToDelete = this.pendingDelete;

    this.villaService.deleteVilla(villaToDelete.id).subscribe({
      next: () => {
        this.villas = this.villas.filter(v => v.id !== villaToDelete.id);
        this.applyFilter();
        this.pendingDelete = null;
        this.deleting = false;
        this.toast.success(`"${villaToDelete.name}" was deleted successfully.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deleting = false;
        const msg = err?.error?.message || 'Failed to delete villa. Ensure you have admin privileges.';
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  // Quick Create Modal flow
  openCreateModal(): void {
    this.newVilla = {
      name: '',
      description: '',
      price: 150,
      sqft: 1200,
      occupancy: 4,
      imageUrl: '',
      amenities: 'Wi-Fi, Swimming Pool, Air Conditioning',
      propertyType: 'Villa'
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.submittingCreate = false;
  }

  submitCreateModal(): void {
    if (!this.newVilla.name.trim()) {
      this.toast.error('Property name is required.');
      return;
    }
    if (this.newVilla.price <= 0) {
      this.toast.error('Price must be greater than 0.');
      return;
    }

    this.submittingCreate = true;
    this.villaService.createVilla(this.newVilla).subscribe({
      next: (createdVilla: Villa) => {
        this.submittingCreate = false;
        this.showCreateModal = false;
        this.toast.success(`Property "${this.newVilla.name}" created successfully.`);
        if (createdVilla && createdVilla.id) {
          this.villas = [createdVilla, ...this.villas];
        } else {
          this.loadVillas();
        }
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submittingCreate = false;
        const msg = err?.error?.message || 'Failed to create property. Please check the form fields.';
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }
}
