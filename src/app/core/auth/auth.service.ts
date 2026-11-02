import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { TokenService } from './token.service';
import { LoginRequest, User } from './auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<User | null>(this.tokenService.getUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal() && this.tokenService.hasToken());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);

  hasRole(role: string): boolean {
    const current = this.currentUserSignal();
    return !!current && current.role.toUpperCase() === role.toUpperCase();
  }

  login(credentials: LoginRequest, returnUrl = '/'): Observable<User> {
    return this.apiService.get<User[]>('users', {
      email: credentials.email,
      password: credentials.password
    }).pipe(
      map((users) => {
        if (!users || users.length === 0) {
          throw new Error('Invalid email or password');
        }

        const user = users[0];
        const token = `mock-jwt-token-${Date.now()}`;

        this.tokenService.setToken(token);
        this.tokenService.setUser(user);
        this.currentUserSignal.set(user);

        this.notificationService.success(
          'Authentication Successful',
          `Welcome back, ${user.name}`
        );

        void this.router.navigateByUrl(returnUrl);
        return user;
      })
    );
  }

  logout(): void {
    this.tokenService.clear();
    this.currentUserSignal.set(null);

    this.notificationService.info(
      'Session Ended',
      'You have been successfully logged out.'
    );

    void this.router.navigate(['/auth/login']);
  }
}
