import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

@Component({
  selector: 'app-physical-records',
  standalone: true,
  imports: [RouterLink, HelpBannerComponent],
  template: `
    <section class="physical-records-hub" aria-label="Physical Records Control">
      <h1>Physical Records</h1>
      <p class="subtitle">Barcode scanning, location tracking, and loan management.</p>

      <app-help-banner
        title="Physical Records Management"
        [tips]="[
          'Use barcode scanning to quickly find and track physical files.',
          'The location tree shows where files are stored (rooms, shelves, boxes).',
          'Loan management tracks who borrowed a file and when it\\'s due back.',
          'Overdue loans are flagged automatically — you can send reminders.',
          'Moving records updates their location in the system in real-time.'
        ]">
      </app-help-banner>

      <div class="action-cards">
        <a routerLink="scan" class="action-card" aria-label="Scan Barcode">
          <span class="card-icon">📷</span>
          <h3>Scan Barcode</h3>
          <p>Scan a file barcode to find it instantly. Supports single and bulk scan modes.</p>
        </a>

        <a routerLink="locations" class="action-card" aria-label="Storage Locations">
          <span class="card-icon">🗄️</span>
          <h3>Storage Locations</h3>
          <p>Browse the location tree — rooms, shelves, and boxes where physical files are stored.</p>
        </a>

        <a routerLink="move" class="action-card" aria-label="Move Records">
          <span class="card-icon">🚚</span>
          <h3>Move Records</h3>
          <p>Transfer physical files to a new location. Supports single or bulk moves.</p>
        </a>

        <a routerLink="overdue-loans" class="action-card overdue" aria-label="Overdue Loans">
          <span class="card-icon">⏰</span>
          <h3>Overdue Loans</h3>
          <p>View all files that haven't been returned on time. Send reminders to borrowers.</p>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .physical-records-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .action-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
    .action-card {
      display: block;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 1.5rem;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
      background: #fff;
    }
    .action-card:hover, .action-card:focus {
      border-color: #1976d2;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
      outline: none;
    }
    .card-icon { font-size: 2rem; display: block; margin-bottom: 0.75rem; }
    .action-card h3 { margin: 0 0 0.5rem; font-size: 1.05rem; color: #1976d2; }
    .action-card p { margin: 0; font-size: 0.85rem; color: #555; line-height: 1.4; }
    .action-card.overdue:hover { border-color: #d32f2f; }
    .action-card.overdue:hover h3 { color: #d32f2f; }
  `]
})
export class PhysicalRecordsComponent {}
