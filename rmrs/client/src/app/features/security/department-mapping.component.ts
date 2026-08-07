import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';
import { Department, CreateDepartmentRequest } from '@shared/models';

interface SyncResult {
  totalWorkgroups: number;
  created: number;
  skipped: number;
  createdDepartments: string[];
  skippedDepartments: string[];
}

/**
 * Department-to-workgroup CRUD management component.
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
@Component({
  selector: 'app-department-mapping',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="department-mapping" aria-label="Department-Workgroup Mapping">
      <header class="page-header">
        <h1>Department Mappings</h1>
        <p class="subtitle">Map municipal departments to their Bitrix workgroup drives.</p>
        <div class="header-actions">
          <button class="btn-sync" (click)="syncFromBitrix()" [disabled]="syncing()"
            aria-label="Sync departments from Bitrix workgroups">
            {{ syncing() ? '⏳ Syncing...' : '🔄 Sync from Bitrix' }}
          </button>
        </div>
      </header>

      @if (syncResult()) {
        <div class="sync-result" role="status">
          <p><strong>Sync Complete:</strong> {{ syncResult()!.created }} created, {{ syncResult()!.skipped }} skipped ({{ syncResult()!.totalWorkgroups }} total workgroups)</p>
          @if (syncResult()!.createdDepartments.length > 0) {
            <details>
              <summary>Created ({{ syncResult()!.createdDepartments.length }})</summary>
              <ul>
                @for (name of syncResult()!.createdDepartments; track name) {
                  <li>{{ name }}</li>
                }
              </ul>
            </details>
          }
          @if (syncResult()!.skippedDepartments.length > 0) {
            <details>
              <summary>Skipped — already exists ({{ syncResult()!.skippedDepartments.length }})</summary>
              <ul>
                @for (name of syncResult()!.skippedDepartments; track name) {
                  <li>{{ name }}</li>
                }
              </ul>
            </details>
          }
        </div>
      }

      <!-- Add new mapping -->
      <details class="add-section">
        <summary>Add New Department Mapping</summary>
        <form [formGroup]="addForm" (ngSubmit)="createMapping()" class="add-form" aria-label="Add department mapping">
          <div class="form-grid">
            <div class="form-group">
              <label for="deptCode">Department Code *</label>
              <input id="deptCode" type="text" formControlName="departmentCode" placeholder="e.g., FIN" aria-required="true" />
            </div>
            <div class="form-group">
              <label for="deptName">Department Name *</label>
              <input id="deptName" type="text" formControlName="departmentName" placeholder="e.g., Finance" aria-required="true" />
            </div>
            <div class="form-group">
              <label for="workgroupId">Bitrix Workgroup ID *</label>
              <input id="workgroupId" type="number" formControlName="bitrixWorkgroupId" aria-required="true" />
            </div>
            <div class="form-group">
              <label for="driveId">Bitrix Drive ID *</label>
              <input id="driveId" type="number" formControlName="bitrixDriveId" aria-required="true" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="addForm.invalid || saving()">
              {{ saving() ? 'Creating...' : 'Create Mapping' }}
            </button>
          </div>
        </form>
      </details>

      <!-- Existing mappings -->
      @if (loading()) {
        <div class="loading" role="status"><p>Loading department mappings...</p></div>
      } @else {
        <table class="mapping-table" role="grid" aria-label="Department mappings">
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Name</th>
              <th scope="col">Workgroup ID</th>
              <th scope="col">Drive ID</th>
              <th scope="col">Active</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (dept of departments(); track dept.id) {
              <tr [class.inactive]="!dept.isActive">
                <td><code>{{ dept.departmentCode }}</code></td>
                <td>{{ dept.departmentName }}</td>
                <td>{{ dept.bitrixWorkgroupId }}</td>
                <td>{{ dept.bitrixDriveId }}</td>
                <td>
                  <span [class]="dept.isActive ? 'badge-active' : 'badge-inactive'">
                    {{ dept.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="action-cell">
                  <button class="btn-validate" (click)="validateMapping(dept)"
                    [attr.aria-label]="'Validate workgroup for ' + dept.departmentName">
                    Validate
                  </button>
                  <button class="btn-delete" (click)="deleteMapping(dept)"
                    [attr.aria-label]="'Delete mapping for ' + dept.departmentName">
                    Delete
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty-state">No department mappings configured.</td>
              </tr>
            }
          </tbody>
        </table>
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
    .department-mapping { padding: 1.5rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .add-section { margin-bottom: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
    .add-section summary { font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.25rem; }
    .form-group input { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .form-actions { display: flex; gap: 0.5rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { padding: 1.5rem; text-align: center; }
    .mapping-table { width: 100%; border-collapse: collapse; }
    .mapping-table th, .mapping-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .mapping-table th { background: #f5f5f5; font-weight: 600; font-size: 0.875rem; }
    .mapping-table tr.inactive { opacity: 0.6; }
    .badge-active { color: #2e7d32; font-size: 0.75rem; }
    .badge-inactive { color: #d32f2f; font-size: 0.75rem; }
    .action-cell { display: flex; gap: 0.25rem; }
    .btn-validate { background: none; border: 1px solid #4caf50; color: #4caf50; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
    .btn-delete { background: none; border: 1px solid #d32f2f; color: #d32f2f; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
    .empty-state { text-align: center; padding: 1.5rem; color: #666; }
    .error-message { color: #d32f2f; margin-top: 1rem; }
    .success-message { color: #2e7d32; margin-top: 1rem; }
    .header-actions { margin-top: 0.75rem; }
    .btn-sync { background: #ff9800; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 0.875rem; }
    .btn-sync:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sync:hover:not(:disabled) { background: #f57c00; }
    .sync-result { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
    .sync-result p { margin: 0 0 0.5rem; }
    .sync-result details { margin-top: 0.5rem; }
    .sync-result summary { cursor: pointer; font-size: 0.875rem; color: #1b5e20; }
    .sync-result ul { margin: 0.25rem 0 0 1rem; padding: 0; font-size: 0.8125rem; }
  `]
})
export class DepartmentMappingComponent implements OnInit {
  departments = signal<Department[]>([]);
  loading = signal(true);
  saving = signal(false);
  syncing = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  syncResult = signal<SyncResult | null>(null);

  addForm: FormGroup;

  constructor(
    private readonly api: ApiService,
    private readonly fb: FormBuilder
  ) {
    this.addForm = this.fb.group({
      departmentCode: ['', Validators.required],
      departmentName: ['', Validators.required],
      bitrixWorkgroupId: [null, [Validators.required, Validators.min(1)]],
      bitrixDriveId: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading.set(true);
    this.api.get<Department[]>('/departments').subscribe({
      next: (deps) => {
        this.departments.set(deps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  createMapping(): void {
    if (this.addForm.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    const payload: CreateDepartmentRequest = this.addForm.value;
    this.api.post<Department>('/departments', payload).subscribe({
      next: () => {
        this.successMessage.set('Department mapping created successfully.');
        this.addForm.reset();
        this.saving.set(false);
        this.loadDepartments();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to create mapping.');
        this.saving.set(false);
      }
    });
  }

  validateMapping(dept: Department): void {
    this.error.set(null);
    this.successMessage.set(null);

    this.api.post(`/departments/${dept.id}/validate`).subscribe({
      next: () => this.successMessage.set(`Workgroup for '${dept.departmentName}' validated successfully.`),
      error: () => this.error.set(`Validation failed for '${dept.departmentName}'. Workgroup may not exist.`)
    });
  }

  deleteMapping(dept: Department): void {
    this.error.set(null);
    this.successMessage.set(null);

    this.api.delete(`/departments/${dept.id}`).subscribe({
      next: () => {
        this.successMessage.set(`Department '${dept.departmentName}' deleted.`);
        this.loadDepartments();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Cannot delete department with active records.');
      }
    });
  }

  syncFromBitrix(): void {
    this.syncing.set(true);
    this.error.set(null);
    this.successMessage.set(null);
    this.syncResult.set(null);

    this.api.post<SyncResult>('/departments/sync-from-bitrix').subscribe({
      next: (result) => {
        this.syncResult.set(result);
        this.syncing.set(false);
        this.loadDepartments();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to sync from Bitrix. Check connection and try again.');
        this.syncing.set(false);
      }
    });
  }
}
