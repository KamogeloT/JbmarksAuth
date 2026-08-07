import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

/**
 * Component for generating reports with parameter selection and PDF/Excel export.
 * Validates: Requirements 12.1, 12.2
 */
@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HelpBannerComponent],
  template: `
    <section class="report-generator" aria-label="Generate Report">
      <header class="page-header">
        <h1>Generate Report</h1>
        @if (reportType()) {
          <p class="subtitle">Report: {{ reportType() }}</p>
        }
      </header>

      <app-help-banner
        title="Generating Reports"
        [tips]="['Choose a report type and set your filters.', 'Reports can be exported to PDF or Excel.', 'Date range, department, and status filters are available.', 'Dashboard reports update in real-time.', 'Role-based dashboards show relevant KPIs for your role.']">
      </app-help-banner>

      <form [formGroup]="reportForm" (ngSubmit)="generateReport()" class="report-form" aria-label="Report parameters form">
        <div class="form-group">
          <label for="dateFrom">Date From *</label>
          <input id="dateFrom" type="date" formControlName="dateFrom" aria-required="true" />
          @if (reportForm.get('dateFrom')?.invalid && reportForm.get('dateFrom')?.touched) {
            <span class="error" role="alert">Start date is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="dateTo">Date To *</label>
          <input id="dateTo" type="date" formControlName="dateTo" aria-required="true" />
          @if (reportForm.get('dateTo')?.invalid && reportForm.get('dateTo')?.touched) {
            <span class="error" role="alert">End date is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="department">Department (optional)</label>
          <input id="department" type="text" formControlName="departmentCode" placeholder="Leave blank for all departments" />
        </div>

        <div class="form-group">
          <label for="format">Export Format *</label>
          <select id="format" formControlName="format" aria-required="true">
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" [disabled]="reportForm.invalid || generating()" title="Generate the report and download it in the selected format">
            {{ generating() ? 'Generating...' : 'Generate & Download' }}
          </button>
          <button type="button" class="btn-secondary" (click)="goBack()">Back to Reports</button>
        </div>
      </form>

      @if (error()) {
        <p class="error-message" role="alert">{{ error() }}</p>
      }
    </section>
  `,
  styles: [`
    .report-generator { padding: 1.5rem; max-width: 600px; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #1976d2; margin: 0 0 1.5rem; font-weight: 500; }
    .report-form .form-group { margin-bottom: 1.25rem; }
    .report-form label { display: block; font-weight: 500; margin-bottom: 0.25rem; font-size: 0.875rem; }
    .report-form input, .report-form select { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem; }
    .error { color: #d32f2f; font-size: 0.75rem; }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .error-message { color: #d32f2f; margin-top: 1rem; }
  `]
})
export class ReportGeneratorComponent implements OnInit {
  reportType = signal<string | null>(null);
  generating = signal(false);
  error = signal<string | null>(null);

  reportForm: FormGroup;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder
  ) {
    this.reportForm = this.fb.group({
      dateFrom: ['', Validators.required],
      dateTo: ['', Validators.required],
      departmentCode: [''],
      format: ['pdf', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.reportType.set(params['type']);
      }
    });
  }

  generateReport(): void {
    if (this.reportForm.invalid) return;
    this.generating.set(true);
    this.error.set(null);

    const payload = {
      reportType: this.reportType(),
      dateFrom: this.reportForm.value.dateFrom,
      dateTo: this.reportForm.value.dateTo,
      departmentCode: this.reportForm.value.departmentCode || undefined,
      format: this.reportForm.value.format
    };

    this.api.download('/reports/generate').subscribe({
      next: (blob) => {
        const extension = payload.format === 'pdf' ? 'pdf' : 'xlsx';
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${this.reportType()}-${payload.dateFrom}.${extension}`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.generating.set(false);
      },
      error: () => {
        this.error.set('Failed to generate report. Please try again.');
        this.generating.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/reports']);
  }
}
