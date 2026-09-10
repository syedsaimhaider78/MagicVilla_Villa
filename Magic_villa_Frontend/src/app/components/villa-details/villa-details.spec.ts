import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { VillaDetailsComponent } from './villa-details';
import { VillaService } from '../../services/villa.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('VillaDetailsComponent', () => {
  let component: VillaDetailsComponent;
  let fixture: ComponentFixture<VillaDetailsComponent>;

  const mockVillaService = {
    getVillaById: () => of({
      id: 1,
      name: 'Royal Villa',
      description: 'A luxurious villa',
      price: 250,
      sqft: 1200,
      occupancy: 4,
      imageUrl: '',
      amenities: 'Pool, WiFi'
    })
  };

  const mockBookingService = {
    create: () => of({})
  };

  const mockAuthService = {
    isLoggedIn: () => true,
    getUser: () => ({ id: 1, name: 'John Doe', role: 'Customer' })
  };

  const mockToastService = {
    success: () => {},
    error: () => {}
  };

  const mockRouter = {
    navigate: () => {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VillaDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '1' : null)
              }
            }
          }
        },
        { provide: Router, useValue: mockRouter },
        { provide: VillaService, useValue: mockVillaService },
        { provide: BookingService, useValue: mockBookingService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VillaDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load villa details on init', () => {
    expect(component.villa).toBeDefined();
    expect(component.villa?.id).toBe(1);
    expect(component.loading).toBe(false);
  });

  it('should display conflict error message when booking fails with 400', () => {
    const errorResponse = {
      status: 400,
      error: {
        isSuccess: false,
        message: 'This villa is already booked for these dates. It will be available from 25 Sep 2026.'
      }
    };
    spyOn(mockBookingService, 'create').and.returnValue(throwError(() => errorResponse));
    spyOn(mockToastService, 'error');

    component.villa = { id: 1, name: 'Royal Villa', price: 250, sqft: 1200, occupancy: 4 } as any;
    component.checkIn = '2026-09-20';
    component.checkOut = '2026-09-24';

    component.reserve();

    expect(component.booking).toBe(false);
    expect(component.bookingError).toBe('This villa is already booked for these dates. It will be available from 25 Sep 2026.');
    expect(mockToastService.error).toHaveBeenCalledWith('This villa is already booked for these dates. It will be available from 25 Sep 2026.');
  });
});
