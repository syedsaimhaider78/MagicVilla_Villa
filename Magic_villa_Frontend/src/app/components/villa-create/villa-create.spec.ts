import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { VillaCreateComponent } from './villa-create';
import { VillaService } from '../../services/villa.service';
import { ToastService } from '../../services/toast.service';

describe('VillaCreateComponent', () => {
  let component: VillaCreateComponent;
  let fixture: ComponentFixture<VillaCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VillaCreateComponent],
      providers: [
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: VillaService, useValue: { createVilla: () => of({}) } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VillaCreateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
