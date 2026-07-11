import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/api';

/**
 * Dashboard data for Executive_Viewer role.
 */
export interface ExecutiveDashboardData {
  totalRecordsAllDepartments: number;
  totalRecordsThisMonth: number;
  totalDepartments: number;
  complianceRate: number;
  storageUtilization: number;
  pendingDisposals: number;
  archivedRecords: number;
  departmentBreakdown: DepartmentSummary[];
}

export interface DepartmentSummary {
  departmentName: string;
  totalRecords: number;
  thisMonth: number;
}

/**
 * Executive dashboard showing aggregate cross-department statistics.
 * Validates: Requirements 12.4
 */
@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="dashboard executive-dashboard" aria-label="Executive Dashboard">
      <h1>Executive Dashboard</h1>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading dashboard">
          <p>Loading executive summary...</p>
        </div>
      } @else {
        <div class="metrics-grid" role="list" aria-label="Executive metrics">
          <div class="metric-card large" role="listitem">
            <span class="metric-value">{{ data()?.totalRecordsAllDepartments ?? 0 }}</span>
            <span class="metric-label">Total Records (All Departments)</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ data()?.totalRecordsThisMonth ?? 0 }}</span>
            <span class="metric-label">Registered This Month</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ data()?.totalDepartments ?? 0 }}</span>
            <span class="metric-label">Active Departments</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ data()?.complianceRate ?? 0 }}%</span>
            <span class="metric-label">Compliance Rate</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ data()?.pendingDisposals ?? 0 }}</span>
            <span class="metric-label">Pending Disposals</span>
          </div>
          <div class="metric-card" role="listitem">
            <span class="metric-value">{{ data()?.archivedRecords ?? 0 }}</span>
            <span class="metric-label">Archived Records</span>
          </div>
        </div>

        @if (data()?.departmentBreakdown && data()!.departmentBreakdown.length > 0) {
          <div class="department-section">
            <h2>Department Breakdown</h2>
            <table class="dept-table" role="grid" aria-label="Department breakdown">
              <thead>
                <tr>
                  <th scope="col">Department</th>
                  <th scope="col">Total Records</th>
                  <th scope="col">This Month</th>
                </tr>
              </thead>
              <tbody>
                @for (dept of data()!.departmentBreakdown; track dept.departmentName) {
                  <tr>
                    <td>{{ dept.departmentName }}</td>
                    <td>{{ dept.totalRecords }}</td>
                    <td>{{ dept.thisMonth }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .dashboard { padding: 1.5rem; }
    h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .metric-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; text-align: center; }
    .metric-card.large { grid-column: span 2; }
    .metric-value { display: block; font-size: 2rem; font-weight: 700; color: #1976d2; }
    .metric-label { display: block; margin-top: 0.5rem; font-size: 0.875rem; color: #555; }
    .department-section h2 { font-size: 1.125rem; margin: 0 0 1rem; }
    .dept-table { width: 100%; border-collapse: collapse; }
    .dept-table th, .dept-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .dept-table th { background: #f5f5f5; font-weight: 600; }
  `]
})
export class ExecutiveDashboardComponent implements OnInit {
  data = signal<ExecutiveDashboardData | null>(null);
  loading = signal(true);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.get<ExecutiveDashboardData>('/dashboards/Executive_Viewer').subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
