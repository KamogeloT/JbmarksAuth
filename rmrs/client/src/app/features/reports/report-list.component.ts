import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '@core/api';

/**
 * Available report type definition.
 */
export interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * Component showing available report types that users can generate.
 * Validates: Requirements 12.1
 */
@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="report-list" aria-label="Available Reports">
      <header class="page-header">
        <h1>Reports</h1>
        <p class="subtitle">Select a report to generate with PDF or Excel export.</p>
      </header>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading reports">
          <p>Loading available reports...</p>
        </div>
      } @else {
        <div class="reports-grid" role="list" aria-label="Report types">
          @for (report of reportTypes(); track report.id) {
            <div class="report-card" role="listitem" tabindex="0"
              (click)="selectReport(report)"
              (keydown.enter)="selectReport(report)"
              [attr.aria-label]="'Generate ' + report.name + ' report'">
              <h3>{{ report.name }}</h3>
              <p class="category">{{ report.category }}</p>
              <p class="description">{{ report.description }}</p>
            </div>
          } @empty {
            <p>No reports available.</p>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .report-list { padding: 1.5rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .report-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; cursor: pointer; transition: box-shadow 0.2s, border-color 0.2s; }
    .report-card:hover, .report-card:focus { border-color: #1976d2; box-shadow: 0 2px 8px rgba(0,0,0,0.1); outline: none; }
    .report-card h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .report-card .category { font-size: 0.75rem; color: #1976d2; text-transform: uppercase; margin: 0 0 0.5rem; }
    .report-card .description { font-size: 0.875rem; color: #555; margin: 0; }
  `]
})
export class ReportListComponent implements OnInit {
  reportTypes = signal<ReportType[]>([]);
  loading = signal(true);

  constructor(
    private readonly api: ApiService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.api.get<ReportType[]>('/reports/types').subscribe({
      next: (types) => {
        this.reportTypes.set(types);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectReport(report: ReportType): void {
    this.router.navigate(['/reports/generate'], { queryParams: { type: report.id } });
  }
}
