import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Column configuration for the data table.
 */
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

/**
 * Sort state emitted when the user clicks a sortable column header.
 */
export interface SortEvent {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Page change event emitted when user navigates between pages.
 */
export interface PageEvent {
  page: number;
  pageSize: number;
}

/**
 * Reusable data table component with sorting and pagination.
 * Uses Angular 17+ standalone patterns with signals and new control flow.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-table-container">
      <table class="data-table" role="grid" aria-label="Data table">
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th
                [style.width]="col.width || 'auto'"
                [attr.aria-sort]="getAriaSortValue(col.key)"
                (click)="col.sortable ? toggleSort(col.key) : null"
                (keydown.enter)="col.sortable ? toggleSort(col.key) : null"
                [attr.tabindex]="col.sortable ? 0 : null"
                [class.sortable]="col.sortable">
                {{ col.label }}
                @if (col.sortable) {
                  <span class="sort-indicator" aria-hidden="true">
                    @if (sortColumn() === col.key) {
                      {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                    }
                  </span>
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of data(); track trackByFn()(row)) {
            <tr (click)="rowClick.emit(row)" tabindex="0" (keydown.enter)="rowClick.emit(row)">
              @for (col of columns(); track col.key) {
                <td>{{ row[col.key] }}</td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="columns().length" class="empty-state">
                {{ emptyMessage() }}
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (showPagination()) {
        <nav class="pagination" aria-label="Table pagination">
          <button
            [disabled]="currentPage() <= 1"
            (click)="goToPage(currentPage() - 1)"
            aria-label="Previous page">
            &laquo; Previous
          </button>
          <span class="page-info" aria-live="polite">
            Page {{ currentPage() }} of {{ totalPages() }}
          </span>
          <button
            [disabled]="currentPage() >= totalPages()"
            (click)="goToPage(currentPage() + 1)"
            aria-label="Next page">
            Next &raquo;
          </button>
        </nav>
      }
    </div>
  `,
  styles: [`
    .data-table-container { width: 100%; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .data-table th { background: #f5f5f5; font-weight: 600; }
    .data-table th.sortable { cursor: pointer; user-select: none; }
    .data-table th.sortable:hover { background: #ebebeb; }
    .data-table tbody tr:hover { background: #fafafa; cursor: pointer; }
    .sort-indicator { margin-left: 0.25rem; font-size: 0.75rem; }
    .empty-state { text-align: center; padding: 2rem; color: #666; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem 0; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
    .page-info { font-size: 0.875rem; color: #555; }
  `]
})
export class DataTableComponent {
  /** Column definitions */
  columns = input.required<TableColumn[]>();

  /** Row data to display */
  data = input.required<any[]>();

  /** Total number of items for pagination */
  totalItems = input<number>(0);

  /** Current page number (1-indexed) */
  currentPage = input<number>(1);

  /** Items per page */
  pageSize = input<number>(10);

  /** Function to produce a unique track key per row */
  trackByFn = input<(row: any) => any>(() => (row: any) => row.id ?? row);

  /** Message shown when data is empty */
  emptyMessage = input<string>('No data available.');

  /** Emitted when a column sort is toggled */
  sortChange = output<SortEvent>();

  /** Emitted when page changes */
  pageChange = output<PageEvent>();

  /** Emitted when a row is clicked */
  rowClick = output<any>();

  /** Internal sort state */
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');

  /** Compute total pages */
  totalPages = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    return size > 0 ? Math.ceil(total / size) : 1;
  });

  /** Whether to show pagination controls */
  showPagination = computed(() => this.totalItems() > this.pageSize());

  toggleSort(columnKey: string): void {
    if (this.sortColumn() === columnKey) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columnKey);
      this.sortDirection.set('asc');
    }
    this.sortChange.emit({ column: this.sortColumn()!, direction: this.sortDirection() });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit({ page, pageSize: this.pageSize() });
    }
  }

  getAriaSortValue(columnKey: string): string | null {
    if (this.sortColumn() !== columnKey) return null;
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }
}
