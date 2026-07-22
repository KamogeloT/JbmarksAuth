import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { Record, PaginatedResponse } from '../../shared/models';
import { DataTableComponent, TableColumn, SortEvent, PageEvent } from '../../shared/components/data-table/data-table.component';
import { DateFormatPipe, ClassificationLevelPipe, RecordStatusPipe } from '../../shared/pipes';
import { HttpParams } from '@angular/common/http';

/**
 * Component displaying a list of records with filtering and sorting capabilities.
 */
@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent, DateFormatPipe, ClassificationLevelPipe, RecordStatusPipe],
  template: `
    <div class="record-list" aria-label="Records list">
      <div class="list-header">
        <h2>Records Registry</h2>
      </div>

      <!-- Filters -->
      <div class="filters" role="search" aria-label="Record filters">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="filter-row">
            <div class="filter-group">
              <label for="search">Search</label>
              <input id="search" type="text" formControlName="search" placeholder="Search by subject, registry number..." />
            </div>
            <div class="filter-group">
              <label for="recordType">Type</label>
              <select id="recordType" formControlName="recordType">
                <option value="">All Types</option>
                <option value="Incoming">Incoming</option>
                <option value="Outgoing">Outgoing</option>
                <option value="Internal">Internal</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="status">Status</label>
              <select id="status" formControlName="status">
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="DisposalPending">Disposal Pending</option>
                <option value="Disposed">Disposed</option>
                <option value="Archived">Archived</option>
                <option value="TransferPending">Transfer Pending</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="dateFrom">Date From</label>
              <input id="dateFrom" type="date" formControlName="dateFrom" />
            </div>
            <div class="filter-group">
              <label for="dateTo">Date To</label>
              <input id="dateTo" type="date" formControlName="dateTo" />
            </div>
            <div class="filter-actions">
              <button type="submit" class="btn btn-primary" aria-label="Apply filters">Filter</button>
              <button type="button" class="btn btn-secondary" (click)="clearFilters()" aria-label="Clear all filters">Clear</button>
            </div>
          </div>
        </form>
      </div>

      <!-- Results -->
      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">Loading records...</div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadRecords()">Retry</button>
        </div>
      } @else {
        <div class="results-info" aria-live="polite">
          <span>{{ totalItems() }} record(s) found</span>
        </div>

        <app-data-table
          [columns]="columns"
          [data]="tableData()"
          [totalItems]="totalItems()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize()"
          emptyMessage="No records found matching your criteria."
          (sortChange)="onSort($event)"
          (pageChange)="onPageChange($event)"
          (rowClick)="onRowClick($event)" />
      }
    </div>
  `,
  styles: [`
    .record-list { padding: 1rem; }
    .list-header { margin-bottom: 1.5rem; }
    .list-header h2 { margin: 0; font-size: 1.25rem; }
    .filters { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
    .filter-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; min-width: 140px; }
    .filter-group label { font-size: 0.75rem; font-weight: 500; margin-bottom: 0.25rem; color: #555; }
    .filter-group input, .filter-group select {
      padding: 0.4375rem 0.625rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.8125rem;
    }
    .filter-group input:focus, .filter-group select:focus { outline: none; border-color: #1976d2; }
    .filter-actions { display: flex; gap: 0.5rem; }
    .results-info { font-size: 0.8125rem; color: #666; margin-bottom: 0.75rem; }
    .btn { padding: 0.4375rem 0.875rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8125rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-secondary { background: #f5f5f5; border: 1px solid #ccc; color: #333; }
    .btn-secondary:hover { background: #ebebeb; }
    .loading { text-align: center; padding: 2rem; color: #666; }
    .error-state { text-align: center; padding: 2rem; color: #d32f2f; }
  `]
})
export class RecordListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  records = signal<Record[]>([]);
  tableData = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  totalItems = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  sortColumn = signal<string>('createdAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  /** Signal for selected record - can be consumed by parent */
  selectedRecord = signal<Record | null>(null);

  columns: TableColumn[] = [
    { key: 'registryNumber', label: 'Registry Number', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'recordType', label: 'Type', sortable: true },
    { key: 'dateReceivedOrSent', label: 'Date', sortable: true },
    { key: 'classificationDisplay', label: 'Classification' },
    { key: 'statusDisplay', label: 'Status', sortable: true }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    recordType: [''],
    status: [''],
    dateFrom: [''],
    dateTo: ['']
  });

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    this.error.set('');

    let params = new HttpParams()
      .set('page', this.currentPage().toString())
      .set('pageSize', this.pageSize().toString())
      .set('sortBy', this.sortColumn())
      .set('sortDirection', this.sortDirection());

    const filters = this.filterForm.value;
    if (filters.search) params = params.set('search', filters.search);
    if (filters.recordType) params = params.set('recordType', filters.recordType);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);

    this.api.get<PaginatedResponse<Record>>('/records', params).subscribe({
      next: (response) => {
        this.records.set(response.items);
        this.totalItems.set(response.totalCount);
        this.tableData.set(response.items.map(r => ({
          ...r,
          classificationDisplay: this.getClassificationLabel(r.classificationLevel),
          statusDisplay: this.getStatusLabel(r.status)
        })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load records. Please try again.');
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadRecords();
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', recordType: '', status: '', dateFrom: '', dateTo: '' });
    this.currentPage.set(1);
    this.loadRecords();
  }

  onSort(event: SortEvent): void {
    this.sortColumn.set(event.column);
    this.sortDirection.set(event.direction);
    this.loadRecords();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadRecords();
  }

  onRowClick(row: any): void {
    this.selectedRecord.set(row as Record);
  }

  private getClassificationLabel(level: number): string {
    const labels: { [key: number]: string } = { 0: 'Public', 1: 'Internal', 2: 'Confidential', 3: 'Restricted' };
    return labels[level] || `Level ${level}`;
  }

  private getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      Active: 'Active', DisposalPending: 'Disposal Pending', Disposed: 'Disposed',
      Archived: 'Archived', TransferPending: 'Transfer Pending'
    };
    return labels[status] || status;
  }
}
