import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataTableComponent, TableColumn, SortEvent, PageEvent } from '@shared/components';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';
import { DateFormatPipe } from '@shared/pipes';
import { ApiService } from '@core/api';
import { DisposalCandidate, PaginatedResponse } from '@shared/models';

/**
 * Displays a list of records eligible for disposal based on expired retention periods.
 * Allows Records_Manager to select candidates and create disposal batches.
 * Validates: Requirements 7.2
 */
@Component({
  selector: 'app-disposal-candidates',
  standalone: true,
  imports: [CommonModule, DataTableComponent, HelpBannerComponent, DateFormatPipe],
  template: `
    <section class="disposal-candidates" aria-label="Disposal Candidates">
      <header class="page-header">
        <h1>Disposal Candidates</h1>
        <p class="subtitle">Records with expired retention periods eligible for disposal.</p>
      </header>

      <app-help-banner
        title="Record Disposal"
        [tips]="['Records appear here once their retention period has expired.', 'Review candidates carefully before creating a disposal batch.', 'Records with legal or audit holds are excluded automatically.', 'A disposal authority number is required before destruction.', 'Disposal certificates are generated and permanently retained.']">
      </app-help-banner>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading candidates">
          <p>Loading disposal candidates...</p>
        </div>
      } @else {
        <div class="toolbar">
          <span class="count" aria-live="polite">
            {{ totalItems() }} record(s) eligible for disposal
          </span>
          <button
            class="btn-primary"
            [disabled]="selectedIds().length === 0"
            (click)="createBatch()"
            title="Bundle selected records into a disposal batch for review"
            aria-label="Create disposal batch from selected records">
            Create Disposal Batch ({{ selectedIds().length }})
          </button>
        </div>

        <div class="candidates-table">
          <table role="grid" aria-label="Disposal candidates list" class="data-table">
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    [checked]="allSelected()"
                    (change)="toggleAll($event)"
                    aria-label="Select all candidates" />
                </th>
                <th scope="col">Registry Number</th>
                <th scope="col">Subject</th>
                <th scope="col">Department</th>
                <th scope="col">Classification</th>
                <th scope="col">Retention Expiry</th>
              </tr>
            </thead>
            <tbody>
              @for (candidate of candidates(); track candidate.recordId) {
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      [checked]="isSelected(candidate.recordId)"
                      (change)="toggleSelection(candidate.recordId)"
                      [attr.aria-label]="'Select ' + candidate.registryNumber" />
                  </td>
                  <td>{{ candidate.registryNumber }}</td>
                  <td>{{ candidate.subject }}</td>
                  <td>{{ candidate.departmentCode }}</td>
                  <td>{{ candidate.filePlanClassificationCode }}</td>
                  <td>{{ candidate.retentionExpiryDate | dateFormat }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty-state">No records currently eligible for disposal.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (totalItems() > pageSize()) {
          <nav class="pagination" aria-label="Candidates pagination">
            <button
              [disabled]="currentPage() <= 1"
              (click)="changePage(currentPage() - 1)"
              aria-label="Previous page">
              Previous
            </button>
            <span aria-live="polite">Page {{ currentPage() }} of {{ totalPages() }}</span>
            <button
              [disabled]="currentPage() >= totalPages()"
              (click)="changePage(currentPage() + 1)"
              aria-label="Next page">
              Next
            </button>
          </nav>
        }
      }
    </section>
  `,
  styles: [`
    .disposal-candidates { padding: 1.5rem; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .count { font-size: 0.875rem; color: #555; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .data-table th { background: #f5f5f5; font-weight: 600; }
    .data-table tbody tr:hover { background: #fafafa; }
    .empty-state { text-align: center; padding: 2rem; color: #666; }
    .loading { padding: 2rem; text-align: center; }
    .pagination { display: flex; justify-content: center; gap: 1rem; padding: 1rem 0; align-items: center; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class DisposalCandidatesComponent implements OnInit {
  candidates = signal<DisposalCandidate[]>([]);
  selectedIds = signal<number[]>([]);
  loading = signal(true);
  totalItems = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);

  allSelected = signal(false);

  constructor(
    private readonly api: ApiService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadCandidates();
  }

  loadCandidates(): void {
    this.loading.set(true);
    this.api.get<PaginatedResponse<DisposalCandidate>>('/disposal/candidates', undefined).subscribe({
      next: (response) => {
        this.candidates.set(response.items);
        this.totalItems.set(response.totalCount);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  isSelected(recordId: number): boolean {
    return this.selectedIds().includes(recordId);
  }

  toggleSelection(recordId: number): void {
    const current = this.selectedIds();
    if (current.includes(recordId)) {
      this.selectedIds.set(current.filter(id => id !== recordId));
    } else {
      this.selectedIds.set([...current, recordId]);
    }
    this.updateAllSelected();
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.set(this.candidates().map(c => c.recordId));
    } else {
      this.selectedIds.set([]);
    }
    this.allSelected.set(checked);
  }

  createBatch(): void {
    this.router.navigate(['/disposal/batch'], {
      state: { selectedRecordIds: this.selectedIds() }
    });
  }

  changePage(page: number): void {
    this.currentPage.set(page);
    this.loadCandidates();
  }

  private updateAllSelected(): void {
    this.allSelected.set(
      this.candidates().length > 0 && this.selectedIds().length === this.candidates().length
    );
  }
}
