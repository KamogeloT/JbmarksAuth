import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap } from 'rxjs';
import { environment } from '@env/environment';
import { UserProfile, UserRole } from '@shared/models/user.model';

/**
 * AuthService - DEV BYPASS MODE
 * Auto-authenticates as admin (user ID 1) for testing.
 * Remove this bypass before production.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  // Mock admin user for testing
  private readonly mockUser: UserProfile = {
    id: 1,
    bitrixUserId: 1,
    email: 'admin@t3ssystems.co.za',
    fullName: 'System Administrator',
    departmentCode: null,
    maxClassificationLevel: 4,
    roles: [
      UserRole.SystemAdministrator,
      UserRole.RecordsManager,
      UserRole.RegistryClerk,
      UserRole.DepartmentUser,
      UserRole.DepartmentSupervisor,
      UserRole.ComplianceOfficer,
      UserRole.Auditor,
      UserRole.Archivist,
      UserRole.ExecutiveViewer
    ],
    isActive: true
  };

  // Reactive state using signals - auto-authenticated
  private currentUserSignal = signal<UserProfile | null>(this.mockUser);
  private isAuthenticatedSignal = signal<boolean>(true);
  private isLoadingSignal = signal<boolean>(false);

  // Public computed signals (read-only)
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(): void {
    // Bypass - already authenticated
  }

  loadCurrentUser(): Observable<UserProfile> {
    return of(this.mockUser);
  }

  logout(): Observable<void> {
    return of(undefined);
  }

  clearSession(): void {
    // No-op in bypass mode
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    return user?.roles?.includes(role) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }
}
