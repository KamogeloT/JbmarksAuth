import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/api';
import { ComplianceMetrics } from '@shared/models';

/**
 * Compliance dashboard showing pending disposals, retention metrics,
 * and file plan coverage.
 * Validates: Requirements 11.4
 */
@Component({
  selector: 'app-compliance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="dashboard compliance-dashboard" aria-label="Compliance Dashboard">
      <h1>Compliance Dashboard</h1>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading compliance data">
          <p>Loading compliance metrics...</p>
        </div>
      } @else {
        <div class="metrics-grid" role="list" aria-label="Compliance metrics">
          <div class="metric-card warning" role="listitem">
            <span class="metric-value">{{ metrics()?.pendingDisposals ?? 0 }}</span>
            <span class="metric-label">Pending Disposals</span>
          </div>
          <div class="metric-card danger" role="listitem">
            <span class="metric-value">{{ metrics()?.overdueDisposals ?? 0 }}</span>
            <span class="metric-label">Overdue Disposals</span>
          </div>
          <div class="metric-card warning" role="listitem">
            <span class="metric-value">{{ metrics()?.recordsApproachingExpiry ?? 0 }}</span>
            <span class="metric-label">Approaching Retention Expiry</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ metrics()?.filePlanCoverage ?? 0 }}%</span>
            <span class="metric-label">File Plan Coverage</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ metrics()?.totalActiveRecords ?? 0 }}</span>
            <span class="metric-label">Total Active Records</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ metrics()?.totalArchivedRecords ?? 0 }}</span>
            <span class="metric-label">Total Archived Records</span>
          </div>
        </div>

        <div class="actions-section">
          <h2>Quick Actions</h2>
          <div class="action-buttons">
            <button class="btn-secondary" (click)="generateReport()" aria-label="Generate compliance report">
              Generate Compliance Report
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .dashboard { padding: 1.5rem; }
    h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .metric-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; text-align: center; }
    .metric-card.warning { border-color: #ff9800; }
    .metric-card.danger { border-color: #d32f2f; }
    .metric-value { display: block; font-size: 2rem; font-weight: 700; color: #1976d2; }
    .metric-card.warning .metric-value { color: #e65100; }
    .metric-card.danger .metric-value { color: #d32f2f; }
    .metric-label { display: block; margin-top: 0.5rem; font-size: 0.875rem; color: #555; }
    .actions-section h2 { font-size: 1.125rem; margin: 0 0 1rem; }
    .action-buttons { display: flex; gap: 0.75rem; }
    .btn-secondary { background: #fff; border: 1px solid #1976d2; color: #1976d2; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
  `]
})
export class ComplianceDashboardComponent implements OnInit {
  metrics = signal<ComplianceMetrics | null>(null);
  loading = signal(true);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.get<ComplianceMetrics>('/audit/compliance/metrics').subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  generateReport(): void {
    this.api.post('/audit/compliance/report').subscribe();
  }
}
