import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Villa } from '../../models/villa.model';
import { VillaService } from '../../services/villa.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-villa-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './villa-edit.html',
  styleUrl: './villa-edit.scss'
})
export class VillaEditComponent implements OnInit {
  villa: Villa = {
    id: 0,
    name: '',
    description: '',
    price: 0,
    sqft: 0,
    occupancy: 0,
    imageUrl: '',
    amenities: '',
    propertyType: 'Villa'
  };
  loading = true;
  submitting = false;
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: VillaService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.loading = false;
      this.errorMessage = 'Invalid villa ID.';
      this.toast.error('Invalid villa ID.');
      this.cdr.detectChanges();
      this.router.navigate(['/villas']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.service.getVillaById(id).subscribe({
      next: (v: any) => {
        this.villa = v?.result || v?.data || v;
        if (!this.villa.propertyType) this.villa.propertyType = 'Villa';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load this villa.';
        this.loading = false;
        this.toast.error(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.submitting) return;
    this.submitting = true;
    this.service.updateVilla(this.villa.id, this.villa).subscribe({
      next: () => {
        this.toast.success('Villa updated successfully.');
        this.router.navigate(['/villas']);
      },
      error: () => {
        this.submitting = false;
        this.toast.error('Failed to update villa.');
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/villas']);
  }
}
