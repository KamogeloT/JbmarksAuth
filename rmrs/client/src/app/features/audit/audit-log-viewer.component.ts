import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '@core/api';
import { AuditLog, AuditQuery, PaginatedResponse } from '@shared/models';
import { DateFormatPipe } from '@shared/pipes';
import { DataTableComponent, TableColumn, SortEvent, PageEvent } from '@shared/components';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

/**
 * Filterable, paginated audit log viewer component.
 * Provides read-only access to the immutable audit log.
 * Validates: Requirements 11.1, 11.2, 11.3
 */
@Component({
  selector: 'app-audit-log-viewer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateFormatPipe, DataTableComponent, HelpBannerComponent],
  template: `
    <section class="audit-log-viewer" aria-label="Audit Log Viewer">
      <header class="page-header">
        <h1>Audit Log</h1>
        <p class="subtitle">Immutable record of all system operations.</p>
      </header>

      <app-help-banner
        title="Audit Trail"
        [tips]="['View a complete history of all actions in the system.', 'Filter by user, action type, date range, or record.', 'Audit logs cannot be deleted or modified.', 'Use this for compliance evidence and investigations.', 'Export audit data for external reporting.']">
      </app-help-banner>

      <!-- Filter Panel -->
      <details class="filter-panel" open>
        <summary>Filters</summary>
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="filter-form" aria-label="Audit log filters">
          <div class="filter-row">
            <div class="filter-group">
              <label for="entityType">Entity Type</label>
              <select id="entityType" formControlName="entityType">
                <option value="">All Types</option>
                <option value="Record">Record</option>
                <option value="Document">Document</option>
                <option value="FilePlanEntry">File Plan Entry</option>
                <option value="PhysicalRecord">Physical Record</option>
                <option value="Configuration">Configuration</option>
                <option value="User">User</option>
                <option value="Department">Department</option>
              </select>
            </div>

            <div class="filter-group">
              <label for="actionType">Action Type</label>
              <select id="actionType" formControlName="actionType">
                <option value="">All Actions</option>
                <option value="Create">Create</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
                <option value="StatusChange">Status Change</option>
                <option value="Read">Read</option>
              </select>
            </div>

            <div class="filter-group">
              <label for="fromDate">From Date</label>
              <input id="fromDate" type="date" formControlName="fromDate" />
            </div>

            <div class="filter-group">
              <label for="toDate">To Date</label>
              <input id="toDate" type="date" formControlName="toDate" />
            </div>

            <div class="filter-group">
              <label for="userId">User ID</label>
              <input id="userId" type="number" formControlName="userId" placeholder="Optional" />
            </div>
          </div>

          <div class="filter-actions">
            <button type="submit" class="btn-primary" title="Apply filters to narrow down audit log entries">Apply</button>
            <button type="button" class="btn-secondary" (click)="clearFilters()" title="Reset all filters and show all audit entries">Clear</button>
          </div>
        </form>
      </details>

      <!-- Results -->
      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading audit logs">
          <p>Loading audit logs...</p>
        </div>
      } @else {
        <app-data-table
          [columns]="columns"
          [data]="logs()"
          [totalItems]="totalItems()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize()"
          [trackByFn]="trackById"
          emptyMessage="No audit log entries found."
          (sortChange)="onSortChange($event)"
          (pageChange)="onPageChange($event)">
        </app-data-table>
      }
    </section>
  `,
  styles: [`
    .audit-log-viewer { padding: 1.5rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .filter-panel { margin-bottom: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
    .filter-panel summary { cursor: pointer; font-weight: 600; margin-bottom: 0.75rem; }
    .filter-form .filter-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .filter-group label { display: block; font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.25rem; }
    .filter-group input, .filter-group select { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem; }
    .filter-actions { display: flex; gap: 0.5rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
    .loading { padding: 2rem; text-align: center; }
  `]
})
export class AuditLogViewerComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  loading = signal(true);
  totalItems = signal(0);
  currentPage = signal(1);
  pageSize = signal(25);

  columns: TableColumn[] = [
    { key: 'timestamp', label: 'Timestamp', sortable: true, width: '160px' },
    { key: 'userId', label: 'User ID', sortable: true, width: '80px' },
    { key: 'actionType', label: 'Action', sortable: true, width: '100px' },
    { key: 'entityType', label: 'Entity Type', sortable: true, width: '120px' },
    { key: 'entityId', label: 'Entity ID', sortable: false, width: '80px' },
    { key: 'sourceIpAddress', label: 'IP Address', sortable: false, width: '120px' }
  ];

  trackById = (row: any) => row.id;

  filterForm: FormGroup;
  private sortBy = 'timestamp';
  private sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private readonly api: ApiService,
    private readonly fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      entityType: [''],
      actionType: [''],
      fromDate: [''],
      toDate: [''],
      userId: [null]
    });
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    const params = this.buildQueryParams();

    this.api.get<PaginatedResponse<AuditLog>>('/audit/logs', params).subscribe({
      next: (response) => {
        this.logs.set(response.items);
        this.totalItems.set(response.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  clearFilters(): void {
    this.filterForm.reset({
      entityType: '',
      actionType: '',
      fromDate: '',
      toDate: '',
      userId: null
    });
    this.applyFilters();
  }

  onSortChange(event: SortEvent): void {
    this.sortBy = event.column;
    this.sortDirection = event.direction;
    this.loadLogs();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadLogs();
  }

  private buildQueryParams(): any {
    const value = this.filterForm.value;
    const params: any = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };
    if (value.entityType) params.entityType = value.entityType;
    if (value.actionType) params.actionType = value.actionType;
    if (value.fromDate) params.fromDate = value.fromDate;
    if (value.toDate) params.toDate = value.toDate;
    if (value.userId) params.userId = value.userId;
    return params;
  }
}
