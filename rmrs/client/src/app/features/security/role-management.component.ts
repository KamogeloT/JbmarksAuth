import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';
import { UserRole } from '@shared/models';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

/**
 * User role assignment data.
 */
export interface UserRoleAssignment {
  id: number;
  userId: number;
  roleName: string;
  effectiveDate: string;
  assignedByUserId: number;
  justification: string;
  isActive: boolean;
}

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
}

/**
 * Role management component for assigning and revoking user roles with justification.
 * Validates: Requirements 10.4
 */
@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HelpBannerComponent],
  template: `
    <section class="role-management" aria-label="Role Management">
      <header class="page-header">
        <h1>Role Management</h1>
        <p class="subtitle">Assign and revoke roles for system users. All changes require justification.</p>
      </header>

      <app-help-banner
        title="Role Management"
        [tips]="['Assign roles to control what users can do in the system.', 'Each role has specific permissions — check the matrix.', 'Changes require a justification reason.', 'Users can have multiple roles if needed.', 'Role changes take effect immediately.']">
      </app-help-banner>

      <!-- User search -->
      <div class="user-search">
        <label for="userSearch">Find User</label>
        <div class="search-row">
          <input id="userSearch" type="text" [(ngModel)]="searchQuery" placeholder="Search by name or email..."
            (keydown.enter)="searchUsers()" aria-label="Search users" />
          <button class="btn-primary" (click)="searchUsers()">Search</button>
        </div>
      </div>

      @if (users().length > 0) {
        <div class="users-list">
          @for (user of users(); track user.id) {
            <div class="user-card" [class.selected]="selectedUser()?.id === user.id"
              (click)="selectUser(user)" (keydown.enter)="selectUser(user)" tabindex="0"
              [attr.aria-label]="'Select user ' + user.fullName">
              <strong>{{ user.fullName }}</strong>
              <span class="email">{{ user.email }}</span>
              <div class="current-roles">
                @for (role of user.roles; track role) {
                  <span class="role-badge">{{ role }}</span>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Role assignment form (when user selected) -->
      @if (selectedUser()) {
        <div class="assignment-section">
          <h2>Manage Roles for {{ selectedUser()!.fullName }}</h2>

          <!-- Current roles with revoke -->
          <div class="current-roles-section">
            <h3>Current Roles</h3>
            @for (role of selectedUser()!.roles; track role) {
              <div class="role-row">
                <span class="role-name">{{ role }}</span>
                <button class="btn-revoke" (click)="revokeRole(role)"
                  [attr.aria-label]="'Revoke ' + role + ' from ' + selectedUser()!.fullName">
                  Revoke
                </button>
              </div>
            } @empty {
              <p class="no-roles">No roles assigned.</p>
            }
          </div>

          <!-- Assign new role -->
          <div class="assign-section">
            <h3>Assign New Role</h3>
            <form [formGroup]="assignForm" (ngSubmit)="assignRole()" aria-label="Assign role form">
              <div class="form-row">
                <div class="form-group">
                  <label for="newRole">Role *</label>
                  <select id="newRole" formControlName="roleName" aria-required="true">
                    <option value="">-- Select Role --</option>
                    @for (role of availableRoles; track role) {
                      <option [value]="role">{{ role }}</option>
                    }
                  </select>
                </div>
                <div class="form-group flex-2">
                  <label for="justification">Justification *</label>
                  <input id="justification" type="text" formControlName="justification"
                    placeholder="Reason for role assignment" aria-required="true" />
                </div>
                <button type="submit" class="btn-primary" [disabled]="assignForm.invalid || saving()" title="Assign the selected role to this user">
                  {{ saving() ? 'Assigning...' : 'Assign' }}
                </button>
              </div>
              @if (assignForm.get('justification')?.invalid && assignForm.get('justification')?.touched) {
                <span class="error" role="alert">Justification is required.</span>
              }
            </form>
          </div>
        </div>
      }

      @if (error()) {
        <p class="error-message" role="alert">{{ error() }}</p>
      }
      @if (successMessage()) {
        <p class="success-message" role="status">{{ successMessage() }}</p>
      }
    </section>
  `,
  styles: [`
    .role-management { padding: 1.5rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .user-search { margin-bottom: 1.5rem; }
    .user-search label { display: block; font-weight: 500; margin-bottom: 0.25rem; }
    .search-row { display: flex; gap: 0.5rem; }
    .search-row input { flex: 1; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .users-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
    .user-card { border: 1px solid #e0e0e0; border-radius: 4px; padding: 0.75rem 1rem; cursor: pointer; }
    .user-card:hover, .user-card.selected { border-color: #1976d2; background: #e3f2fd; }
    .user-card strong { display: block; }
    .email { font-size: 0.8125rem; color: #555; }
    .current-roles { display: flex; gap: 0.25rem; margin-top: 0.25rem; flex-wrap: wrap; }
    .role-badge { background: #e8eaf6; color: #3f51b5; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.7rem; }
    .assignment-section { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; }
    .assignment-section h2 { margin: 0 0 1rem; font-size: 1.125rem; }
    .assignment-section h3 { margin: 1rem 0 0.5rem; font-size: 0.9375rem; }
    .current-roles-section { margin-bottom: 1rem; }
    .role-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.5rem; border-bottom: 1px solid #f0f0f0; }
    .role-name { font-size: 0.875rem; }
    .btn-revoke { background: none; border: 1px solid #d32f2f; color: #d32f2f; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
    .no-roles { color: #666; font-size: 0.875rem; }
    .assign-section .form-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
    .assign-section .form-group { flex: 1; min-width: 150px; }
    .assign-section .form-group.flex-2 { flex: 2; }
    .assign-section label { display: block; font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.25rem; }
    .assign-section input, .assign-section select { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .error { color: #d32f2f; font-size: 0.75rem; }
    .error-message { color: #d32f2f; margin-top: 1rem; }
    .success-message { color: #2e7d32; margin-top: 1rem; }
  `]
})
export class RoleManagementComponent {
  users = signal<UserSummary[]>([]);
  selectedUser = signal<UserSummary | null>(null);
  saving = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  searchQuery = '';

  readonly availableRoles = Object.values(UserRole);

  assignForm: FormGroup;

  constructor(
    private readonly api: ApiService,
    private readonly fb: FormBuilder
  ) {
    this.assignForm = this.fb.group({
      roleName: ['', Validators.required],
      justification: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  searchUsers(): void {
    if (!this.searchQuery.trim()) return;
    this.api.get<UserSummary[]>(`/users?search=${encodeURIComponent(this.searchQuery)}`).subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([])
    });
  }

  selectUser(user: UserSummary): void {
    this.selectedUser.set(user);
    this.error.set(null);
    this.successMessage.set(null);
  }

  assignRole(): void {
    if (this.assignForm.invalid || !this.selectedUser()) return;
    this.saving.set(true);
    this.error.set(null);

    this.api.post(`/users/${this.selectedUser()!.id}/roles`, {
      roleName: this.assignForm.value.roleName,
      justification: this.assignForm.value.justification
    }).subscribe({
      next: () => {
        const user = this.selectedUser()!;
        const newRole = this.assignForm.value.roleName;
        this.selectedUser.set({ ...user, roles: [...user.roles, newRole] });
        this.successMessage.set(`Role '${newRole}' assigned successfully.`);
        this.assignForm.reset({ roleName: '', justification: '' });
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to assign role.');
        this.saving.set(false);
      }
    });
  }

  revokeRole(roleName: string): void {
    if (!this.selectedUser()) return;
    this.error.set(null);

    this.api.delete(`/users/${this.selectedUser()!.id}/roles/${roleName}`).subscribe({
      next: () => {
        const user = this.selectedUser()!;
        this.selectedUser.set({ ...user, roles: user.roles.filter(r => r !== roleName) });
        this.successMessage.set(`Role '${roleName}' revoked successfully.`);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to revoke role.');
      }
    });
  }
}
