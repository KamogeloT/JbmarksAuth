import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

/**
 * HTTP interceptor for auth token injection.
 * Attaches session credentials to all API requests directed at the RMRS backend.
 * Uses withCredentials to include the HttpOnly session cookie automatically.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Only attach credentials for requests to our API
  if (req.url.startsWith(environment.apiBaseUrl)) {
    const authReq = req.clone({
      withCredentials: true
    });
    return next(authReq);
  }

  return next(req);
};
