import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffChat } from './staff-chat';

describe('StaffChat', () => {
  let component: StaffChat;
  let fixture: ComponentFixture<StaffChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffChat],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffChat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
