import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, exhaustMap, of, Subject, tap } from 'rxjs';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { AuthService, LanguageService, LoginRequest, NotificationService, TranslatePipe } from '@core';
import { FormErrorComponent, LoaderComponent } from '@shared';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    Card,
    InputText,
    Password,
    Button,
    Toast,
    TranslatePipe,
    FormErrorComponent,
    LoaderComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly languageService = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSubmitting = signal<boolean>(false);
  private readonly submit$ = new Subject<LoginRequest>();

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    this.submit$
      .pipe(
        tap(() => this.isSubmitting.set(true)),
        exhaustMap((credentials) => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
          return this.authService.login(credentials, returnUrl).pipe(
            catchError((err: unknown) => {
              const message =
                err instanceof Error
                  ? err.message
                  : this.languageService.translate('auth.invalidCredentials');
              this.notificationService.error(
                this.languageService.translate('auth.loginFailed'),
                message
              );
              return of(null);
            }),
            tap(() => this.isSubmitting.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submit$.next(this.loginForm.getRawValue());
  }

  fillDemoCredentials(): void {
    this.loginForm.patchValue({
      email: 'admin@company.com',
      password: 'Password123'
    });
    this.loginForm.markAsDirty();
  }
}
