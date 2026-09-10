import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { Villa } from '../models/villa.model';

@Injectable({ providedIn: 'root' })
export class VillaService {
  private readonly apiUrl = 'https://localhost:44373/api/VillaApi';

  constructor(private readonly http: HttpClient) {}

  getAllVillas(category?: string, search?: string): Observable<Villa[]> {
    let params = new HttpParams();
    if (category && category !== 'All') {
      params = params.set('category', category);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.request(this.http.get<Villa[]>(this.apiUrl, {
      headers: this.options().headers,
      params
    }));
  }

  getAll(category?: string, search?: string): Observable<Villa[]> {
    return this.getAllVillas(category, search);
  }

  getVillaById(id: number): Observable<Villa> {
    return this.request(this.http.get<Villa>(`${this.apiUrl}/${id}`, this.options()));
  }

  getVilla(id: number): Observable<Villa> {
    return this.getVillaById(id);
  }

  createVilla(villa: Omit<Villa, 'id'>): Observable<Villa> {
    return this.request(this.http.post<Villa>(this.apiUrl, villa, this.options()));
  }

  updateVilla(id: number, villa: Villa): Observable<void> {
    return this.request(this.http.put<void>(`${this.apiUrl}/${id}`, villa, this.options()));
  }

  deleteVilla(id: number): Observable<void> {
    return this.request(this.http.delete<void>(`${this.apiUrl}/${id}`, this.options()));
  }

  private options(): { headers: HttpHeaders } {
    const rawUser = localStorage.getItem('mv_user');
    let token = '';
    try {
      token = rawUser ? JSON.parse(rawUser).token || '' : '';
    } catch {
      token = '';
    }
    return {
      headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders()
    };
  }

  private request<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      timeout(10000),
      catchError(error => throwError(() => error))
    );
  }
}
