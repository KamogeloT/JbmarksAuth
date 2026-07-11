import { Component } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Reports hub component - redirects to report list by default.
 * This serves as the landing page for the reports feature.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  template: `
    <section aria-label="Reports and Dashboards">
      <h1>Reports</h1>
      <p>Report generation with PDF/Excel export and role-based dashboards.</p>
    </section>
  `
})
export class ReportsComponent {}
