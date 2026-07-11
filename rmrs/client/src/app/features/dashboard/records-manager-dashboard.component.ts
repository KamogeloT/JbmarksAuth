import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/api';

/**
 * Dashboard data for Records_Manager role.
 */
export interface RecordsManagerDashboardData {
  dailyRegistrationCount: number;
  weeklyRegistrationCount: number;
  overdueLoans: number;
  upcomingDisposals: number;
  transferBatchesPending: number;
  totalActiveRecords: number;
}

/**
 * Records Manager dashboard showing daily registration counts, overdue loans,
 * upcoming disposals, and transfer batch status.
 * Validates: Requirements 12.3
 */
@Component({
  selector: 'app-records-manager-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="dashboard records-manager-dashboard" aria-label="Records Manager Dashboard">
      <h1>Records Manager Dashboard</h1>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading dashboard">
          <p>Loading dashboard data...</p>
        </div>
      } @else {
        <div class="metrics-grid" role="list" aria-label="Key metrics">
          <div class="metric-card" role="listitem">
            <span class="metric-value" aria-label="Today's registrations">{{ data()?.dailyRegistrationCount ?? 0 }}</span>
            <span class="metric-label">Registrations Today</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value" aria-label="This week's registrations">{{ data()?.weeklyRegistrationCount ?? 0 }}</span>
            <span class="metric-label">This Week</span>
          </div>
          <div class="metric-card warning" role="listitem">
            <span class="metric-value" aria-label="Overdue loans">{{ data()?.overdueLoans ?? 0 }}</span>
            <span class="metric-label">Overdue Loans</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value" aria-label="Upcoming disposals">{{ data()?.upcomingDisposals ?? 0 }}</span>
            <span class="metric-label">Upcoming Disposals</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value" aria-label="Pending transfer batches">{{ data()?.transferBatchesPending ?? 0 }}</span>
            <span class="metric-label">Transfer Batches Pending</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value" aria-label="Total active records">{{ data()?.totalActiveRecords ?? 0 }}</span>
            <span class="metric-label">Total Active Records</span>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .dashboard { padding: 1.5rem; }
    h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .metric-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; text-align: center; }
    .metric-card.warning { border-color: #ff9800; }
    .metric-value { display: block; font-size: 2rem; font-weight: 700; color: #1976d2; }
    .metric-card.warning .metric-value { color: #e65100; }
    .metric-label { display: block; margin-top: 0.5rem; font-size: 0.875rem; color: #555; }
  `]
})
export class RecordsManagerDashboardComponent implements OnInit {
  data = signal<RecordsManagerDashboardData | null>(null);
  loading = signal(true);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.get<RecordsManagerDashboardData>('/dashboards/Records_Manager').subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
