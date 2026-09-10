import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/operators';
import { Villa } from '../../models/villa.model';
import { VillaService } from '../../services/villa.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-villa-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './villa-list.html',
  styleUrl: './villa-list.scss'
})
export class VillaListComponent implements OnInit {
  private readonly service = inject(VillaService);
  private readonly router = inject(Router);
  public readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  // Reactive Form Control for Typeahead Search
  searchControl = new FormControl<string>('', { nonNullable: true });

  // Category Subject & Signals
  private readonly categorySubject = new BehaviorSubject<string>('All');
  readonly selectedCategory = signal<string>('All');
  readonly categories: string[] = ['All', 'Villa', 'HotelRoom', 'Apartment'];

  // Reactive Property Signals
  readonly villas = signal<Villa[]>([]);
  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');

  // Delete modal state
  pendingDelete: Villa | null = null;
  deleting = false;

  ngOnInit(): void {
    this.setupReactiveSearch();
  }

  private setupReactiveSearch(): void {
    // Pipe search valueChanges with debounceTime(300), distinctUntilChanged(), and synergy with Category
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    );

    combineLatest([search$, this.categorySubject])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set('');
        }),
        switchMap(([searchTerm, category]) => {
          return this.service.getAllVillas(category, searchTerm).pipe(
            catchError(err => {
              const msg = 'Unable to load properties. Please ensure the backend is running and try again.';
              this.errorMessage.set(msg);
              this.toast.error(msg);
              return of([]);
            })
          );
        })
      )
      .subscribe(result => {
        const list = Array.isArray(result) ? result : (result as any)?.result || (result as any)?.data || [];
        this.villas.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      });
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.categorySubject.next(cat);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  formatCategory(type?: string): string {
    if (!type || type === 'All') return 'All Properties';
    if (type === 'Villa') return 'Villas';
    if (type === 'HotelRoom') return 'Hotel Rooms';
    if (type === 'Apartment') return 'Apartments';
    return type;
  }

  createVilla(): void {
    this.router.navigate(['/villa-create']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/details', id]);
  }

  editVilla(id: number): void {
    this.router.navigate(['/villa-edit', id]);
  }

  requestDelete(villa: Villa): void {
    if (!this.auth.isAdmin()) {
      this.toast.error('Only administrators can delete properties.');
      return;
    }
    this.pendingDelete = villa;
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    this.deleting = true;
    const id = this.pendingDelete.id;
    this.service.deleteVilla(id).subscribe({
      next: () => {
        this.villas.update(current => current.filter(v => v.id !== id));
        this.pendingDelete = null;
        this.deleting = false;
        this.toast.success('Property deleted successfully.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.deleting = false;
        this.toast.error('Failed to delete property.');
        this.cdr.detectChanges();
      }
    });
  }
}
