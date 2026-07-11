import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { FilePlanEntry, RetentionRule } from '../../shared/models';

/**
 * Request payload for creating a new file plan entry.
 */
export interface CreateFilePlanRequest {
  parentId: number | null;
  classificationCode: string;
  title: string;
  description: string;
  retentionRuleId: number;
  disposalAuthorityRef: string;
  defaultClassificationLevel: number;
}

/**
 * Form component for creating and editing file plan entries.
 * Supports all required fields: classification code, title, description,
 * retention rule, disposal authority reference, and default classification level.
 */
@Component({
  selector: 'app-file-plan-entry-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="entry-form" role="form" [attr.aria-label]="editMode ? 'Edit file plan entry' : 'Create file plan entry'">
      <h3>{{ editMode ? 'Edit Entry' : 'Create New Entry' }}</h3>

      @if (parentId !== null) {
        <p class="parent-info">Parent entry ID: {{ parentId }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="classificationCode">Classification Code *</label>
          <input
            id="classificationCode"
            type="text"
            formControlName="classificationCode"
            placeholder="e.g., 1.2.3"
            aria-required="true"
            [attr.aria-invalid]="isFieldInvalid('classificationCode')" />
          @if (isFieldInvalid('classificationCode')) {
            <span class="error-text" role="alert">Classification code is required and must be unique.</span>
          }
        </div>

        <div class="form-group">
          <label for="title">Title *</label>
          <input
            id="title"
            type="text"
            formControlName="title"
            placeholder="Entry title"
            aria-required="true"
            [attr.aria-invalid]="isFieldInvalid('title')" />
          @if (isFieldInvalid('title')) {
            <span class="error-text" role="alert">Title is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="description">Description *</label>
          <textarea
            id="description"
            formControlName="description"
            placeholder="Description of the file plan entry"
            rows="3"
            aria-required="true"
            [attr.aria-invalid]="isFieldInvalid('description')"></textarea>
          @if (isFieldInvalid('description')) {
            <span class="error-text" role="alert">Description is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="retentionRuleId">Retention Rule *</label>
          <select
            id="retentionRuleId"
            formControlName="retentionRuleId"
            aria-required="true"
            [attr.aria-invalid]="isFieldInvalid('retentionRuleId')">
            <option value="" disabled>Select a retention rule</option>
            @for (rule of retentionRules(); track rule.id) {
              <option [value]="rule.id">
                {{ rule.ruleName }} ({{ rule.retentionYears }}y {{ rule.retentionMonths }}m - {{ rule.disposalAction }})
              </option>
            }
          </select>
          @if (isFieldInvalid('retentionRuleId')) {
            <span class="error-text" role="alert">Retention rule is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="disposalAuthorityRef">Disposal Authority Reference *</label>
          <input
            id="disposalAuthorityRef"
            type="text"
            formControlName="disposalAuthorityRef"
            placeholder="e.g., DA-2024-001"
            aria-required="true"
            [attr.aria-invalid]="isFieldInvalid('disposalAuthorityRef')" />
          @if (isFieldInvalid('disposalAuthorityRef')) {
            <span class="error-text" role="alert">Disposal authority reference is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="defaultClassificationLevel">Default Classification Level *</label>
          <select
            id="defaultClassificationLevel"
            formControlName="defaultClassificationLevel"
            aria-required="true">
            <option [value]="0">Public</option>
            <option [value]="1">Internal</option>
            <option [value]="2">Confidential</option>
            <option [value]="3">Restricted</option>
          </select>
        </div>

        @if (serverError()) {
          <div class="server-error" role="alert">{{ serverError() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn btn-cancel" (click)="cancel.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="submitting()">
            {{ submitting() ? 'Saving...' : (editMode ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .entry-form { padding: 1.5rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
    h3 { margin: 0 0 1.5rem; font-size: 1.125rem; }
    .parent-info { font-size: 0.8125rem; color: #666; margin-bottom: 1rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.375rem; font-size: 0.875rem; }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px;
      font-size: 0.875rem; font-family: inherit;
    }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.15);
    }
    .form-group input[aria-invalid="true"], .form-group textarea[aria-invalid="true"], .form-group select[aria-invalid="true"] {
      border-color: #d32f2f;
    }
    .error-text { color: #d32f2f; font-size: 0.75rem; margin-top: 0.25rem; display: block; }
    .server-error { background: #ffebee; color: #c62828; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
    .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-cancel { background: #f5f5f5; border: 1px solid #ccc; color: #333; }
    .btn-cancel:hover { background: #ebebeb; }
  `]
})
export class FilePlanEntryFormComponent implements OnInit, OnChanges {
  @Input() parentId: number | null = null;
  @Input() entry: FilePlanEntry | null = null;
  @Output() saved = new EventEmitter<FilePlanEntry>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  retentionRules = signal<RetentionRule[]>([]);
  submitting = signal<boolean>(false);
  serverError = signal<string>('');

  form!: FormGroup;

  get editMode(): boolean {
    return this.entry !== null;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadRetentionRules();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entry'] && this.form) {
      this.populateForm();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      classificationCode: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.required, Validators.maxLength(256)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      retentionRuleId: ['', [Validators.required]],
      disposalAuthorityRef: ['', [Validators.required, Validators.maxLength(100)]],
      defaultClassificationLevel: [0, [Validators.required]]
    });

    if (this.entry) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (this.entry) {
      this.form.patchValue({
        classificationCode: this.entry.classificationCode,
        title: this.entry.title,
        description: this.entry.description || '',
        retentionRuleId: this.entry.retentionRuleId,
        disposalAuthorityRef: this.entry.disposalAuthorityRef,
        defaultClassificationLevel: this.entry.defaultClassificationLevel
      });
    }
  }

  private loadRetentionRules(): void {
    this.api.get<RetentionRule[]>('/file-plan/retention-rules').subscribe({
      next: (rules) => this.retentionRules.set(rules),
      error: () => this.serverError.set('Failed to load retention rules.')
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set('');

    const formValue = this.form.value;
    const payload: CreateFilePlanRequest = {
      parentId: this.parentId,
      classificationCode: formValue.classificationCode,
      title: formValue.title,
      description: formValue.description,
      retentionRuleId: Number(formValue.retentionRuleId),
      disposalAuthorityRef: formValue.disposalAuthorityRef,
      defaultClassificationLevel: Number(formValue.defaultClassificationLevel)
    };

    const request$ = this.editMode
      ? this.api.put<FilePlanEntry>(`/file-plan/entries/${this.entry!.id}`, payload)
      : this.api.post<FilePlanEntry>('/file-plan/entries', payload);

    request$.subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.saved.emit(result);
      },
      error: (err) => {
        this.submitting.set(false);
        this.serverError.set(err.error?.message || 'Failed to save entry. Please try again.');
      }
    });
  }
}
