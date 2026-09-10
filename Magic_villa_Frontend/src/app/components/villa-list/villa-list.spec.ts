import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { VillaListComponent } from './villa-list';
import { VillaService } from '../../services/villa.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('VillaListComponent', () => {
  let component: VillaListComponent;
  let fixture: ComponentFixture<VillaListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VillaListComponent],
      providers: [
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: VillaService, useValue: { getAllVillas: () => of([]) } },
        { provide: AuthService, useValue: { isAdmin: () => false } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VillaListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
