import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { TokenService } from '../auth/token.service';

export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!req.context.get(SKIP_ERROR_NOTIFICATION)) {
        let errorMessage = 'An unexpected error occurred. Please try again.';

        if (error.error instanceof ErrorEvent) {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'object' && 'message' in error.error) {
          errorMessage = String((error.error as { message: unknown }).message);
        } else if (typeof error.error === 'string' && error.error.trim().length > 0) {
          errorMessage = error.error;
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your network connection.';
        } else if (error.status === 401) {
          errorMessage = 'Session expired or unauthorized. Please log in again.';
          tokenService.clear();
          void router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url }
          });
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.status >= 500) {
          errorMessage = 'Internal server error. Please try again later.';
        }

        notificationService.error(
          `Request Failed (${error.status || 'Network'})`,
          errorMessage
        );
      }

      return throwError(() => error);
    })
  );
};
