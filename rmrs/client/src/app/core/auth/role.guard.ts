import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Functional route guard that checks if the user has the required role(s).
 * Configure required roles via route data:
 *
 * {
 *   path: 'admin',
 *   canActivate: [roleGuard],
 *   data: { roles: ['System_Administrator'] }
 * }
 *
 * If `roles` is an array, the user must have at least one of the listed roles.
 * Redirects to /access-denied if the user lacks the required role(s).
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data?.['roles'] ?? [];

  // If no roles specified, allow access (guard misconfiguration fallback)
  if (requiredRoles.length === 0) {
    return true;
  }

  // Check if user has any of the required roles
  if (authService.hasAnyRole(requiredRoles)) {
    return true;
  }

  // User lacks required role — redirect to access denied page
  return router.createUrlTree(['/access-denied']);
};
