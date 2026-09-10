import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VillaService } from './villa.service';

describe('VillaService', () => {
  let service: VillaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(VillaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
