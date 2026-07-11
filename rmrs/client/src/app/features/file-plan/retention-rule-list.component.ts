import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { RetentionRule } from '../../shared/models';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';

/**
 * Component for viewing and managing retention rules.
 * Displays a list of rules and provides a form for creating new ones.
 */
@Component({
  selector: 'app-retention-rule-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="retention-rules" aria-label="Retention rules management">
      <div class="rules-header">
        <h2>Retention Rules</h2>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())" aria-label="Toggle create retention rule form">
          {{ showForm() ? 'Close Form' : '+ New Rule' }}
        </button>
      </div>

      @if (showForm()) {
        <div class="rule-form" role="form" aria-label="Create new retention rule">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label for="ruleName">Rule Name *</label>
                <input id="ruleName" type="text" formControlName="ruleName" placeholder="e.g., Financial Records 7yr" aria-required="true" />
              </div>
              <div class="form-group form-group-small">
                <label for="retentionYears">Years *</label>
                <input id="retentionYears" type="number" formControlName="retentionYears" min="0" aria-required="true" />
              </div>
              <div class="form-group form-group-small">
                <label for="retentionMonths">Months</label>
                <input id="retentionMonths" type="number" formControlName="retentionMonths" min="0" max="11" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="disposalAction">Disposal Action *</label>
                <select id="disposalAction" formControlName="disposalAction" aria-required="true">
                  <option value="" disabled>Select action</option>
                  <option value="Destroy">Destroy</option>
                  <option value="Archive">Archive</option>
                  <option value="Review">Review</option>
                </select>
              </div>
              <div class="form-group form-group-wide">
                <label for="description">Description</label>
                <input id="description" type="text" formControlName="description" placeholder="Optional description" />
              </div>
            </div>

            @if (formError()) {
              <div class="form-error" role="alert">{{ formError() }}</div>
            }

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                {{ submitting() ? 'Creating...' : 'Create Rule' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">Loading retention rules...</div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadRules()">Retry</button>
        </div>
      } @else {
        <app-data-table
          [columns]="columns"
          [data]="tableData()"
          [totalItems]="rules().length"
          [pageSize]="50"
          emptyMessage="No retention rules defined." />
      }
    </div>
  `,
  styles: [`
    .retention-rules { padding: 1rem; }
    .rules-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .rules-header h2 { margin: 0; font-size: 1.25rem; }
    .rule-form { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 150px; }
    .form-group-small { flex: 0 0 100px; min-width: 80px; }
    .form-group-wide { flex: 2; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.375rem; font-size: 0.875rem; }
    .form-group input, .form-group select {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #1976d2; }
    .form-error { background: #ffebee; color: #c62828; padding: 0.5rem 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .form-actions { display: flex; justify-content: flex-end; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #f5f5f5; border: 1px solid #ccc; color: #333; }
    .loading { text-align: center; padding: 2rem; color: #666; }
    .error-state { text-align: center; padding: 2rem; color: #d32f2f; }
  `]
})
export class RetentionRuleListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  rules = signal<RetentionRule[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  showForm = signal<boolean>(false);
  submitting = signal<boolean>(false);
  formError = signal<string>('');

  columns: TableColumn[] = [
    { key: 'ruleName', label: 'Rule Name', sortable: true },
    { key: 'retentionPeriod', label: 'Retention Period', sortable: true },
    { key: 'disposalAction', label: 'Disposal Action', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' }
  ];

  form: FormGroup = this.fb.group({
    ruleName: ['', [Validators.required, Validators.maxLength(256)]],
    retentionYears: [0, [Validators.required, Validators.min(0)]],
    retentionMonths: [0, [Validators.min(0), Validators.max(11)]],
    disposalAction: ['', [Validators.required]],
    description: ['']
  });

  tableData = signal<any[]>([]);

  ngOnInit(): void {
    this.loadRules();
  }

  loadRules(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<RetentionRule[]>('/file-plan/retention-rules').subscribe({
      next: (rules) => {
        this.rules.set(rules);
        this.tableData.set(rules.map(r => ({
          ...r,
          retentionPeriod: `${r.retentionYears}y ${r.retentionMonths}m`,
          status: r.isActive ? 'Active' : 'Inactive'
        })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load retention rules.');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set('');

    const payload = {
      ruleName: this.form.value.ruleName,
      retentionYears: Number(this.form.value.retentionYears),
      retentionMonths: Number(this.form.value.retentionMonths) || 0,
      disposalAction: this.form.value.disposalAction,
      description: this.form.value.description || null
    };

    this.api.post<RetentionRule>('/file-plan/retention-rules', payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset({ retentionYears: 0, retentionMonths: 0, defaultClassificationLevel: 0 });
        this.showForm.set(false);
        this.loadRules();
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(err.error?.message || 'Failed to create retention rule.');
      }
    });
  }
}
