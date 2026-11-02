import { Injectable } from '@angular/core';
import { User } from './auth.model';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'company_test_token';
  private readonly USER_KEY = 'company_test_user';

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) ?? localStorage.getItem('access_token');
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem('access_token', token);
  }

  getUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY) ?? localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  setUser(user: User): void {
    const serialized = JSON.stringify(user);
    localStorage.setItem(this.USER_KEY, serialized);
    localStorage.setItem('user', serialized);
  }

  hasToken(): boolean {
    const token = this.getToken();
    return !!token && token.trim().length > 0;
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
