import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '@core/api';
import { Department } from '@shared/models';

/**
 * Search filter criteria emitted to parent.
 */
export interface SearchFilters {
  query: string;
  dateFrom: string | null;
  dateTo: string | null;
  recordType: string | null;
  departmentCode: string | null;
  classificationCode: string | null;
  status: string | null;
}

/**
 * Advanced search component with filter panel.
 * Supports date range, record type, department, classification, and status filters.
 * Validates: Requirements 9.4
 */
@Component({
  selector: 'app-advanced-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <aside class="advanced-search-panel" aria-label="Advanced search filters">
      <h2>Filters</h2>
      <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" aria-label="Search filter form">
        <div class="filter-group">
          <label for="dateFrom">Date From</label>
          <input id="dateFrom" type="date" formControlName="dateFrom" aria-label="Filter from date" />
        </div>

        <div class="filter-group">
          <label for="dateTo">Date To</label>
          <input id="dateTo" type="date" formControlName="dateTo" aria-label="Filter to date" />
        </div>

        <div class="filter-group">
          <label for="recordType">Record Type</label>
          <select id="recordType" formControlName="recordType" aria-label="Filter by record type">
            <option value="">All Types</option>
            <option value="Incoming">Incoming</option>
            <option value="Outgoing">Outgoing</option>
            <option value="Internal">Internal</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="department">Department</label>
          <select id="department" formControlName="departmentCode" aria-label="Filter by department">
            <option value="">All Departments</option>
            @for (dept of departments(); track dept.id) {
              <option [value]="dept.departmentCode">{{ dept.departmentName }}</option>
            }
          </select>
        </div>

        <div class="filter-group">
          <label for="classification">Classification Code</label>
          <input id="classification" type="text" formControlName="classificationCode"
            placeholder="e.g., 3/1/2" aria-label="Filter by classification code" />
        </div>

        <div class="filter-group">
          <label for="status">Status</label>
          <select id="status" formControlName="status" aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="DisposalPending">Disposal Pending</option>
            <option value="Disposed">Disposed</option>
            <option value="Archived">Archived</option>
            <option value="TransferPending">Transfer Pending</option>
          </select>
        </div>

        <div class="filter-actions">
          <button type="submit" class="btn-primary">Apply Filters</button>
          <button type="button" class="btn-secondary" (click)="clearFilters()">Clear</button>
        </div>
      </form>
    </aside>
  `,
  styles: [`
    .advanced-search-panel { padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; }
    h2 { margin: 0 0 1rem; font-size: 1.125rem; }
    .filter-group { margin-bottom: 1rem; }
    .filter-group label { display: block; font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.25rem; color: #333; }
    .filter-group input, .filter-group select { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem; }
    .filter-actions { display: flex; gap: 0.5rem; margin-top: 1.25rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
  `]
})
export class AdvancedSearchComponent {
  filtersApplied = output<SearchFilters>();

  departments = signal<Department[]>([]);
  filterForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.filterForm = this.fb.group({
      dateFrom: [''],
      dateTo: [''],
      recordType: [''],
      departmentCode: [''],
      classificationCode: [''],
      status: ['']
    });
    this.loadDepartments();
  }

  private loadDepartments(): void {
    this.api.get<Department[]>('/departments').subscribe({
      next: (deps) => this.departments.set(deps),
      error: () => {} // graceful fallback
    });
  }

  applyFilters(): void {
    const value = this.filterForm.value;
    this.filtersApplied.emit({
      query: '', // query is managed by the parent SearchComponent
      dateFrom: value.dateFrom || null,
      dateTo: value.dateTo || null,
      recordType: value.recordType || null,
      departmentCode: value.departmentCode || null,
      classificationCode: value.classificationCode || null,
      status: value.status || null
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      dateFrom: '',
      dateTo: '',
      recordType: '',
      departmentCode: '',
      classificationCode: '',
      status: ''
    });
    this.applyFilters();
  }
}
