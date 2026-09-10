import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Villa } from '../../models/villa.model';
import { VillaService } from '../../services/villa.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-villa-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './villa-create.html',
  styleUrl: './villa-create.scss'
})
export class VillaCreateComponent {
  submitting = false;
  villa: Omit<Villa, 'id'> = {
    name: '',
    description: '',
    price: 0,
    sqft: 0,
    occupancy: 0,
    imageUrl: '',
    amenities: '',
    propertyType: 'Villa'
  };

  constructor(
    private service: VillaService,
    private router: Router,
    private toast: ToastService
  ) {}

  saveVilla() {
    if (this.submitting) return;
    this.submitting = true;
    this.service.createVilla(this.villa).subscribe({
      next: () => {
        this.toast.success('Property added successfully.');
        this.router.navigate(['/villas']);
      },
      error: () => {
        this.submitting = false;
        this.toast.error('Failed to add property. Please try again.');
      }
    });
  }

  cancel() {
    this.router.navigate(['/villas']);
  }
}
