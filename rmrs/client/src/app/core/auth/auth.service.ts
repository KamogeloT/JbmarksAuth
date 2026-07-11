import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { UserProfile } from '@shared/models/user.model';

/**
 * AuthService manages the authentication state and OAuth flow with Bitrix.
 * Uses Angular signals for reactive state management.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  // Reactive state using signals
  private currentUserSignal = signal<UserProfile | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);

  // Public computed signals (read-only)
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  /**
   * Initiates OAuth login by redirecting to the Bitrix authorization endpoint.
   */
  login(): void {
    window.location.href = `${this.apiUrl}/login`;
  }

  /**
   * Fetches the current user profile from the backend.
   * Called after successful OAuth callback to populate user state.
   */
  loadCurrentUser(): Observable<UserProfile> {
    this.isLoadingSignal.set(true);
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
      tap({
        next: (user) => {
          this.currentUserSignal.set(user);
          this.isAuthenticatedSignal.set(true);
          this.isLoadingSignal.set(false);
        },
        error: () => {
          this.clearSession();
          this.isLoadingSignal.set(false);
        }
      })
    );
  }

  /**
   * Logs out the current user by calling the backend logout endpoint
   * and clearing local state.
   */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        this.clearSession();
        this.router.navigate(['/auth/login']);
      })
    );
  }

  /**
   * Clears all local session state. Called on 401 or explicit logout.
   */
  clearSession(): void {
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }

  /**
   * Checks if the current user has a specific role.
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    return user?.roles?.includes(role) ?? false;
  }

  /**
   * Checks if the current user has any of the specified roles.
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }
}
