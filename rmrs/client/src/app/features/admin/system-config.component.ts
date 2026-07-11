import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';

/**
 * A system configuration setting.
 */
export interface ConfigSetting {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

/**
 * System configuration management for OAuth settings and general configuration.
 * Changes require a reason for audit trail purposes.
 * Validates: Requirements 13.1, 13.5, 13.6
 */
@Component({
  selector: 'app-system-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="system-config" aria-label="System Configuration">
      <header class="page-header">
        <h1>System Configuration</h1>
        <p class="subtitle">Manage OAuth settings and general system configuration.</p>
      </header>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading configuration">
          <p>Loading configuration...</p>
        </div>
      } @else {
        <div class="config-list">
          @for (setting of settings(); track setting.key) {
            <div class="config-item">
              <div class="config-header">
                <h3>{{ setting.key }}</h3>
                <span class="updated-at">Last updated: {{ setting.updatedAt }}</span>
              </div>
              <p class="config-description">{{ setting.description }}</p>

              @if (editingKey() === setting.key) {
                <form [formGroup]="editForm" (ngSubmit)="saveConfig(setting.key)" class="edit-form" aria-label="Edit configuration value">
                  <div class="form-group">
                    <label [for]="'value-' + setting.key">Value</label>
                    <input [id]="'value-' + setting.key" type="text" formControlName="value" />
                  </div>
                  <div class="form-group">
                    <label [for]="'reason-' + setting.key">Reason for Change *</label>
                    <input [id]="'reason-' + setting.key" type="text" formControlName="reason"
                      placeholder="Explain why this change is needed" aria-required="true" />
                    @if (editForm.get('reason')?.invalid && editForm.get('reason')?.touched) {
                      <span class="error" role="alert">Reason is required.</span>
                    }
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn-primary" [disabled]="editForm.invalid || saving()">Save</button>
                    <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancel</button>
                  </div>
                </form>
              } @else {
                <div class="config-value">
                  <code>{{ maskSensitiveValue(setting) }}</code>
                  <button class="btn-edit" (click)="startEdit(setting)" aria-label="Edit {{ setting.key }}">Edit</button>
                </div>
              }
            </div>
          } @empty {
            <p>No configuration settings found.</p>
          }
        </div>

        @if (error()) {
          <p class="error-message" role="alert">{{ error() }}</p>
        }
        @if (successMessage()) {
          <p class="success-message" role="status">{{ successMessage() }}</p>
        }
      }
    </section>
  `,
  styles: [`
    .system-config { padding: 1.5rem; max-width: 800px; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .config-list { display: flex; flex-direction: column; gap: 1rem; }
    .config-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.25rem; }
    .config-header { display: flex; justify-content: space-between; align-items: baseline; }
    .config-header h3 { margin: 0; font-size: 0.9375rem; font-family: monospace; }
    .updated-at { font-size: 0.75rem; color: #888; }
    .config-description { font-size: 0.8125rem; color: #555; margin: 0.25rem 0 0.75rem; }
    .config-value { display: flex; justify-content: space-between; align-items: center; background: #f5f5f5; padding: 0.5rem 0.75rem; border-radius: 4px; }
    .config-value code { font-size: 0.875rem; word-break: break-all; }
    .btn-edit { background: none; border: 1px solid #1976d2; color: #1976d2; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
    .edit-form .form-group { margin-bottom: 0.75rem; }
    .edit-form label { display: block; font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.25rem; }
    .edit-form input { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .error { color: #d32f2f; font-size: 0.75rem; }
    .form-actions { display: flex; gap: 0.5rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
    .error-message { color: #d32f2f; margin-top: 1rem; }
    .success-message { color: #2e7d32; margin-top: 1rem; }
  `]
})
export class SystemConfigComponent implements OnInit {
  settings = signal<ConfigSetting[]>([]);
  loading = signal(true);
  editingKey = signal<string | null>(null);
  saving = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  editForm: FormGroup;

  private readonly sensitiveKeys = ['oauth_client_secret', 'client_secret'];

  constructor(
    private readonly api: ApiService,
    private readonly fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      value: ['', Validators.required],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.api.get<ConfigSetting[]>('/admin/config').subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  startEdit(setting: ConfigSetting): void {
    this.editingKey.set(setting.key);
    this.editForm.setValue({ value: setting.value, reason: '' });
    this.error.set(null);
    this.successMessage.set(null);
  }

  cancelEdit(): void {
    this.editingKey.set(null);
    this.editForm.reset();
  }

  saveConfig(key: string): void {
    if (this.editForm.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    this.api.put(`/admin/config/${key}`, {
      value: this.editForm.value.value,
      reason: this.editForm.value.reason
    }).subscribe({
      next: () => {
        this.successMessage.set(`Configuration '${key}' updated successfully.`);
        this.editingKey.set(null);
        this.saving.set(false);
        this.loadSettings();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to update configuration. Validation may have failed.');
        this.saving.set(false);
      }
    });
  }

  maskSensitiveValue(setting: ConfigSetting): string {
    if (this.sensitiveKeys.some(k => setting.key.toLowerCase().includes(k))) {
      return '••••••••';
    }
    return setting.value;
  }
}
