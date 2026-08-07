import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/api';
import { PaginatedResponse } from '@shared/models';
import { SortEvent, PageEvent } from '@shared/components';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';
import { AdvancedSearchComponent, SearchFilters } from './advanced-search.component';
import { SearchResultsComponent, SearchResultItem } from './search-results.component';

/**
 * Main search component with full-text search bar and integrated advanced filters.
 * Provides access-controlled search across record metadata fields.
 * Validates: Requirements 9.1, 9.4, 9.5, 9.6
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpBannerComponent, AdvancedSearchComponent, SearchResultsComponent],
  template: `
    <section class="search-page" aria-label="Search Records">
      <header class="page-header">
        <h1>Search Records</h1>
      </header>

      <app-help-banner
        title="Searching Records"
        [tips]="['Search by registry number, subject, sender, file reference, or date.', 'Use filters to narrow results by department, status, or classification.', 'Results respect your access permissions — restricted records are hidden.', 'Click a result to view full record details.', 'Save frequent searches for quick access later.']">
      </app-help-banner>

      <!-- Full-text search bar -->
      <div class="search-bar-container" role="search">
        <label for="searchQuery" class="sr-only">Search records</label>
        <input
          id="searchQuery"
          type="search"
          [(ngModel)]="searchQuery"
          (keydown.enter)="executeSearch()"
          placeholder="Search by subject, registry number, sender/recipient..."
          class="search-input"
          aria-label="Full-text search" />
        <button
          (click)="executeSearch()"
          class="btn-search"
          title="Search across all records you have access to"
          aria-label="Execute search">
          Search
        </button>
        <button
          (click)="toggleAdvanced()"
          class="btn-advanced"
          title="Show additional search filters like date range and department"
          [attr.aria-expanded]="showAdvanced()"
          aria-controls="advancedFilters">
          {{ showAdvanced() ? 'Hide Filters' : 'Advanced' }}
        </button>
      </div>

      <div class="search-content" [class.with-sidebar]="showAdvanced()">
        <!-- Advanced filter panel -->
        @if (showAdvanced()) {
          <div id="advancedFilters">
            <app-advanced-search (filtersApplied)="onFiltersApplied($event)"></app-advanced-search>
          </div>
        }

        <!-- Results -->
        <div class="results-area">
          <app-search-results
            [results]="results()"
            [totalCount]="totalCount()"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [loading]="loading()"
            [hasSearched]="hasSearched()"
            (sortChanged)="onSortChange($event)"
            (pageChanged)="onPageChange($event)"
            (recordSelected)="onRecordSelected($event)">
          </app-search-results>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .search-page { padding: 1.5rem; }
    .page-header h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .search-bar-container { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .search-input { flex: 1; padding: 0.625rem 1rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
    .search-input:focus { border-color: #1976d2; outline: 2px solid rgba(25, 118, 210, 0.25); }
    .btn-search { background: #1976d2; color: #fff; border: none; padding: 0.625rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: 500; }
    .btn-advanced { background: #fff; border: 1px solid #ccc; padding: 0.625rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .search-content { display: flex; gap: 1.5rem; }
    .search-content.with-sidebar { display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; }
    .results-area { min-width: 0; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
  `]
})
export class SearchComponent {
  searchQuery = '';
  showAdvanced = signal(false);
  results = signal<SearchResultItem[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  loading = signal(false);
  hasSearched = signal(false);

  private filters: SearchFilters = {
    query: '',
    dateFrom: null,
    dateTo: null,
    recordType: null,
    departmentCode: null,
    classificationCode: null,
    status: null
  };

  private sortBy = '';
  private sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private readonly api: ApiService,
    private readonly router: Router
  ) {}

  toggleAdvanced(): void {
    this.showAdvanced.set(!this.showAdvanced());
  }

  onFiltersApplied(filters: SearchFilters): void {
    this.filters = { ...filters, query: this.searchQuery };
    this.currentPage.set(1);
    this.executeSearch();
  }

  executeSearch(): void {
    this.loading.set(true);
    this.hasSearched.set(true);

    const payload: any = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy || undefined,
      sortDirection: this.sortDirection || undefined,
      ...this.filters
    };

    // Remove null/empty values
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === '') {
        delete payload[key];
      }
    });

    this.api.post<PaginatedResponse<SearchResultItem>>('/search', payload).subscribe({
      next: (response) => {
        this.results.set(response.items);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
      }
    });
  }

  onSortChange(event: SortEvent): void {
    this.sortBy = event.column;
    this.sortDirection = event.direction;
    this.executeSearch();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.executeSearch();
  }

  onRecordSelected(record: SearchResultItem): void {
    this.router.navigate(['/registry', record.id]);
  }
}
