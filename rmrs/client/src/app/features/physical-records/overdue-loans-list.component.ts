import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { Loan } from '../../shared/models';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { DateFormatPipe } from '../../shared/pipes';

/**
 * Extended loan info returned from the overdue loans endpoint.
 */
interface OverdueLoanInfo extends Loan {
  registryNumber?: string;
  borrowerName?: string;
  daysOverdue?: number;
}

/**
 * Component displaying a list of overdue loans with notifications.
 * Shows records that have exceeded their expected return date.
 */
@Component({
  selector: 'app-overdue-loans-list',
  standalone: true,
  imports: [CommonModule, DataTableComponent, DateFormatPipe],
  template: `
    <div class="overdue-loans" aria-label="Overdue loans list">
      <div class="loans-header">
        <h2>Overdue Loans</h2>
        <button class="btn btn-secondary" (click)="loadOverdueLoans()" [disabled]="loading()" aria-label="Refresh overdue loans list">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      @if (overdueCount() > 0) {
        <div class="overdue-alert" role="alert" aria-live="polite">
          <span class="alert-icon" aria-hidden="true">&#9888;</span>
          <span class="alert-text">{{ overdueCount() }} loan(s) are currently overdue and require attention.</span>
        </div>
      }

      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">Loading overdue loans...</div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadOverdueLoans()">Retry</button>
        </div>
      } @else {
        <app-data-table
          [columns]="columns"
          [data]="tableData()"
          [totalItems]="overdueCount()"
          [pageSize]="50"
          emptyMessage="No overdue loans. All records are returned on time." />

        @if (loans().length > 0) {
          <div class="loans-detail" role="list" aria-label="Overdue loan details">
            @for (loan of loans(); track loan.id) {
              <div class="loan-card" role="listitem" [class.critical]="getDaysOverdue(loan) > 30">
                <div class="loan-card-header">
                  <span class="loan-badge" [class.badge-critical]="getDaysOverdue(loan) > 30" [class.badge-warning]="getDaysOverdue(loan) <= 30">
                    {{ getDaysOverdue(loan) }} days overdue
                  </span>
                  @if (loan.registryNumber) {
                    <span class="registry-number">{{ loan.registryNumber }}</span>
                  }
                </div>
                <div class="loan-card-body">
                  <div class="card-row">
                    <span class="card-label">Borrower:</span>
                    <span class="card-value">{{ loan.borrowerName || 'User #' + loan.borrowerUserId }}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-label">Loan Date:</span>
                    <span class="card-value">{{ loan.loanDate | dateFormat }}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-label">Expected Return:</span>
                    <span class="card-value overdue-date">{{ loan.expectedReturnDate | dateFormat }}</span>
                  </div>
                </div>
                <div class="loan-card-actions">
                  <button class="btn btn-sm btn-primary" (click)="sendReminder(loan)" aria-label="Send reminder for overdue loan">
                    Send Reminder
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .overdue-loans { padding: 1.5rem; }
    .loans-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .loans-header h2 { margin: 0; font-size: 1.25rem; }
    .overdue-alert { background: #fff3e0; border: 1px solid #ffcc02; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .alert-icon { font-size: 1.25rem; }
    .alert-text { font-size: 0.875rem; color: #e65100; font-weight: 500; }
    .loading { text-align: center; padding: 2rem; color: #666; }
    .error-state { text-align: center; padding: 2rem; color: #d32f2f; }
    .loans-detail { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .loan-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; background: #fff; }
    .loan-card.critical { border-color: #ef9a9a; background: #fff8f8; }
    .loan-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .loan-badge { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .badge-warning { background: #fff3e0; color: #e65100; }
    .badge-critical { background: #ffebee; color: #c62828; }
    .registry-number { font-size: 0.8125rem; font-weight: 500; color: #1976d2; }
    .loan-card-body { margin-bottom: 0.75rem; }
    .card-row { display: flex; gap: 0.5rem; margin-bottom: 0.375rem; font-size: 0.8125rem; }
    .card-label { color: #666; min-width: 110px; }
    .card-value { color: #333; }
    .overdue-date { color: #d32f2f; font-weight: 500; }
    .loan-card-actions { display: flex; justify-content: flex-end; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-secondary { background: #f5f5f5; border: 1px solid #ccc; color: #333; }
    .btn-secondary:hover { background: #ebebeb; }
    .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
  `]
})
export class OverdueLoansListComponent implements OnInit {
  private readonly api = inject(ApiService);

  loans = signal<OverdueLoanInfo[]>([]);
  tableData = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  overdueCount = signal<number>(0);

  columns: TableColumn[] = [
    { key: 'registryNumber', label: 'Registry Number', sortable: true },
    { key: 'borrowerDisplay', label: 'Borrower', sortable: true },
    { key: 'loanDate', label: 'Loan Date', sortable: true },
    { key: 'expectedReturnDate', label: 'Expected Return', sortable: true },
    { key: 'daysOverdueDisplay', label: 'Days Overdue', sortable: true }
  ];

  ngOnInit(): void {
    this.loadOverdueLoans();
  }

  loadOverdueLoans(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.get<OverdueLoanInfo[]>('/physical-records/overdue-loans').subscribe({
      next: (loans) => {
        this.loans.set(loans);
        this.overdueCount.set(loans.length);
        this.tableData.set(loans.map(loan => ({
          ...loan,
          borrowerDisplay: loan.borrowerName || `User #${loan.borrowerUserId}`,
          daysOverdueDisplay: `${this.getDaysOverdue(loan)} days`
        })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load overdue loans.');
        this.loading.set(false);
      }
    });
  }

  getDaysOverdue(loan: Loan): number {
    const expected = new Date(loan.expectedReturnDate);
    const now = new Date();
    const diff = now.getTime() - expected.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  sendReminder(loan: OverdueLoanInfo): void {
    // Trigger notification via API
    this.api.post(`/physical-records/${loan.physicalRecordId}/loan/remind`).subscribe({
      next: () => {
        // Could show a toast notification
      },
      error: () => {
        // Handle error silently or show notification
      }
    });
  }
}
