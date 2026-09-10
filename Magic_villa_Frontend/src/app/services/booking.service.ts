import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, timeout } from 'rxjs';

export interface Booking {
  id: number;
  villaId: number;
  userId?: number;
  villaName?: string;
  customerName?: string;
  customerEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  price: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = 'https://localhost:44373/api/BookingApi';

  constructor(private readonly http: HttpClient) {}

  getAllBookings(): Observable<Booking[]> {
    return this.request<Booking[]>(this.http.get<Booking[]>(this.api, this.options()));
  }

  getMyBookings(): Observable<Booking[]> {
    return this.request<Booking[]>(this.http.get<Booking[]>(`${this.api}/my`, this.options()));
  }

  create(payload: Pick<Booking, 'villaId' | 'checkInDate' | 'checkOutDate'>): Observable<Booking> {
    return this.request<Booking>(this.http.post<Booking>(this.api, payload, this.options()));
  }

  updateStatus(booking: Booking, status: Booking['status']): Observable<void> {
    return this.request<void>(this.http.put<void>(`${this.api}/${booking.id}`, { ...booking, status }, this.options()));
  }

  private options(): { headers: HttpHeaders } {
    const rawUser = localStorage.getItem('mv_user');
    let token = '';
    try { token = rawUser ? JSON.parse(rawUser).token || '' : ''; } catch { token = ''; }
    return { headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders() };
  }

  private request<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      timeout(10000),
      catchError(error => throwError(() => error))
    );
  }
}
