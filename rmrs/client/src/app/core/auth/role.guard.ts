import { CanActivateFn } from '@angular/router';

/**
 * DEV BYPASS - always allows access.
 * Remove before production.
 */
export const roleGuard: CanActivateFn = () => true;
