import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { QueryParams } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  private buildParams(params?: HttpParams | QueryParams): HttpParams {
    if (!params) {
      return new HttpParams();
    }
    if (params instanceof HttpParams) {
      return params;
    }

    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          for (const item of value) {
            httpParams = httpParams.append(key, String(item));
          }
        } else {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return httpParams;
  }

  get<T>(endpoint: string, params?: HttpParams | QueryParams): Observable<T> {
    return this.http.get<T>(this.buildUrl(endpoint), {
      params: this.buildParams(params)
    });
  }

  getById<T>(endpoint: string, id: string | number): Observable<T> {
    return this.http.get<T>(`${this.buildUrl(endpoint)}/${id}`);
  }

  post<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body);
  }

  put<T, B = unknown>(endpoint: string, id: string | number, body: B): Observable<T> {
    return this.http.put<T>(`${this.buildUrl(endpoint)}/${id}`, body);
  }

  patch<T, B = unknown>(endpoint: string, id: string | number, body: Partial<B> | unknown): Observable<T> {
    return this.http.patch<T>(`${this.buildUrl(endpoint)}/${id}`, body);
  }

  delete<T = void>(endpoint: string, id: string | number): Observable<T> {
    return this.http.delete<T>(`${this.buildUrl(endpoint)}/${id}`);
  }
}
