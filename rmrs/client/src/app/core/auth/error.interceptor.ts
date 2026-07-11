import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * HTTP interceptor for global error handling.
 * Handles common HTTP error responses:
 * - 401 Unauthorized: Clears session state and redirects to login
 * - 403 Forbidden: Navigates to access-denied page
 * - 5xx Server errors: Logs error and surfaces user-friendly notification
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          // Session expired or invalid — redirect to login
          authService.clearSession();
          router.navigate(['/auth/login']);
          break;

        case 403:
          // Insufficient permissions
          router.navigate(['/access-denied']);
          break;

        case 0:
          // Network error — server unreachable
          console.error('Network error: Unable to reach the server.');
          break;

        default:
          // Log all other errors
          console.error(
            `HTTP Error ${error.status}: ${error.message}`,
            error.error
          );
          break;
      }

      return throwError(() => error);
    })
  );
};
