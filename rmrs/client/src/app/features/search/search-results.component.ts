import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent, TableColumn, SortEvent, PageEvent } from '@shared/components';
import { DateFormatPipe } from '@shared/pipes';
import { RecordStatusPipe } from '@shared/pipes';

/**
 * A search result item returned from the API.
 */
export interface SearchResultItem {
  id: number;
  registryNumber: string;
  subject: string;
  recordType: string;
  dateReceivedOrSent: string;
  classificationCode: string;
  status: string;
}

/**
 * Displays search results in a data table with default columns.
 * Implements click-through to record detail.
 * Validates: Requirements 9.5, 9.6
 */
@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, DataTableComponent, DateFormatPipe, RecordStatusPipe],
  template: `
    <section class="search-results" aria-label="Search results">
      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading results">
          <p>Searching...</p>
        </div>
      } @else if (results().length === 0 && hasSearched()) {
        <p class="no-results" role="status">No records found matching your search criteria.</p>
      } @else if (results().length > 0) {
        <div class="results-summary" aria-live="polite">
          <span>{{ totalCount() }} result(s) found</span>
        </div>

        <app-data-table
          [columns]="columns"
          [data]="results()"
          [totalItems]="totalCount()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize()"
          [trackByFn]="trackById"
          emptyMessage="No records found."
          (sortChange)="onSortChange($event)"
          (pageChange)="onPageChange($event)"
          (rowClick)="onRowClick($event)">
        </app-data-table>
      }
    </section>
  `,
  styles: [`
    .search-results { margin-top: 1rem; }
    .loading { padding: 2rem; text-align: center; }
    .no-results { text-align: center; padding: 2rem; color: #666; }
    .results-summary { font-size: 0.875rem; color: #555; margin-bottom: 0.5rem; }
  `]
})
export class SearchResultsComponent {
  results = input.required<SearchResultItem[]>();
  totalCount = input<number>(0);
  currentPage = input<number>(1);
  pageSize = input<number>(20);
  loading = input<boolean>(false);
  hasSearched = input<boolean>(false);

  sortChanged = output<SortEvent>();
  pageChanged = output<PageEvent>();
  recordSelected = output<SearchResultItem>();

  columns: TableColumn[] = [
    { key: 'registryNumber', label: 'Registry Number', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'recordType', label: 'Type', sortable: true },
    { key: 'dateReceivedOrSent', label: 'Date', sortable: true },
    { key: 'classificationCode', label: 'Classification', sortable: false },
    { key: 'status', label: 'Status', sortable: true }
  ];

  trackById = (row: any) => row.id;

  onSortChange(event: SortEvent): void {
    this.sortChanged.emit(event);
  }

  onPageChange(event: PageEvent): void {
    this.pageChanged.emit(event);
  }

  onRowClick(row: any): void {
    this.recordSelected.emit(row as SearchResultItem);
  }
}
