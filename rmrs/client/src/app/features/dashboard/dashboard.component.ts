import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';
import { UserRole } from '@shared/models';
import { RecordsManagerDashboardComponent } from './records-manager-dashboard.component';
import { ExecutiveDashboardComponent } from './executive-dashboard.component';
import { ComplianceDashboardComponent } from './compliance-dashboard.component';

/**
 * Main dashboard component that routes to role-specific dashboards
 * based on the current user's assigned role.
 * Validates: Requirements 12.3, 12.4, 11.4
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RecordsManagerDashboardComponent,
    ExecutiveDashboardComponent,
    ComplianceDashboardComponent
  ],
  template: `
    <div class="dashboard-container">
      @switch (activeDashboard()) {
        @case ('records-manager') {
          <app-records-manager-dashboard />
        }
        @case ('executive') {
          <app-executive-dashboard />
        }
        @case ('compliance') {
          <app-compliance-dashboard />
        }
        @default {
          <section class="dashboard" aria-label="Dashboard">
            <h1>Dashboard</h1>
            <p>Welcome to RMRS. Select a module from the navigation menu to get started.</p>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .dashboard-container { min-height: 100%; }
    .dashboard { padding: 1.5rem; }
    .dashboard h1 { margin: 0 0 1rem; font-size: 1.5rem; }
  `]
})
export class DashboardComponent implements OnInit {
  activeDashboard = signal<'records-manager' | 'executive' | 'compliance' | 'default'>('default');

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.determineDashboard();
  }

  private determineDashboard(): void {
    if (this.authService.hasRole(UserRole.RecordsManager)) {
      this.activeDashboard.set('records-manager');
    } else if (this.authService.hasRole(UserRole.ExecutiveViewer)) {
      this.activeDashboard.set('executive');
    } else if (
      this.authService.hasRole(UserRole.ComplianceOfficer) ||
      this.authService.hasRole(UserRole.Auditor)
    ) {
      this.activeDashboard.set('compliance');
    } else if (this.authService.hasRole(UserRole.SystemAdministrator)) {
      this.activeDashboard.set('records-manager');
    } else {
      this.activeDashboard.set('default');
    }
  }
}
