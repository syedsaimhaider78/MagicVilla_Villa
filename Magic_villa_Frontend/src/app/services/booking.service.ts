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
  status: 'Pending' | 'Approved' | 'Confirmed' | 'Rejected' | 'Cancelled' | 'Completed';
  purposeOfVisit?: string;
  documentUrl?: string;
  createdDate?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = 'https://localhost:44373/api/BookingApi';
  readonly serverBaseUrl = 'https://localhost:44373';

  constructor(private readonly http: HttpClient) {}

  getAllBookings(): Observable<Booking[]> {
    return this.request<Booking[]>(this.http.get<Booking[]>(this.api, this.options()));
  }

  getMyBookings(): Observable<Booking[]> {
    return this.request<Booking[]>(this.http.get<Booking[]>(`${this.api}/my`, this.options()));
  }

  create(data: FormData): Observable<Booking> {
    return this.request<Booking>(this.http.post<Booking>(this.api, data, this.options()));
  }

  approveBooking(id: number): Observable<any> {
    return this.request<any>(this.http.put<any>(`${this.api}/${id}/approve`, {}, this.options()));
  }

  rejectBooking(id: number, reason?: string): Observable<any> {
    return this.request<any>(this.http.put<any>(`${this.api}/${id}/reject`, { status: 'Rejected', note: reason }, this.options()));
  }

  updateStatus(booking: Booking, status: Booking['status']): Observable<void> {
    return this.request<void>(this.http.put<void>(`${this.api}/${booking.id}`, { ...booking, status }, this.options()));
  }

  getDocumentUrl(relativePath?: string): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return relativePath;
    
    // Extract file name
    const fileName = relativePath.split('/').pop();
    if (fileName && (relativePath.includes('uploads/documents') || relativePath.includes('documents/'))) {
      return `${this.serverBaseUrl}/api/BookingApi/document/${fileName}`;
    }
    return `${this.serverBaseUrl}${relativePath}`;
  }

  private options(): { headers: HttpHeaders } {
    const rawUser = localStorage.getItem('mv_user');
    let token = '';
    try { token = rawUser ? JSON.parse(rawUser).token || '' : ''; } catch { token = ''; }
    return { headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders() };
  }

  private request<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      timeout(15000),
      catchError(error => throwError(() => error))
    );
  }
}
