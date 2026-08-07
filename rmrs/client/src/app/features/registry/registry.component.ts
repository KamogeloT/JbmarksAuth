import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

@Component({
  selector: 'app-registry',
  standalone: true,
  imports: [RouterLink, HelpBannerComponent],
  template: `
    <section class="registry-hub" aria-label="Records Registry">
      <h1>Records Registry</h1>
      <p class="subtitle">Register, manage, and track correspondence and records.</p>

      <app-help-banner
        title="How to use the Registry"
        [tips]="[
          'Use this module to register incoming, outgoing, or internal records.',
          'Each record gets a unique registry number automatically.',
          'After registering a record, you can attach documents to it from the Documents module.',
          'Use the Record List to search and filter existing records.',
          'Click on any record to view its full details, attached documents, and history.'
        ]">
      </app-help-banner>

      <div class="action-cards">
        <a routerLink="incoming" class="action-card incoming" aria-label="Register Incoming Record">
          <span class="card-icon">📥</span>
          <h3>Register Incoming</h3>
          <p>Register a new incoming record (mail, correspondence, submissions received).</p>
        </a>

        <a routerLink="outgoing" class="action-card outgoing" aria-label="Register Outgoing Record">
          <span class="card-icon">📤</span>
          <h3>Register Outgoing</h3>
          <p>Register a new outgoing record (letters sent, responses dispatched).</p>
        </a>

        <a routerLink="internal" class="action-card internal" aria-label="Register Internal Record">
          <span class="card-icon">📋</span>
          <h3>Register Internal</h3>
          <p>Register an internal record (memos, minutes, internal approvals).</p>
        </a>

        <a routerLink="list" class="action-card list" aria-label="View All Records">
          <span class="card-icon">📑</span>
          <h3>View All Records</h3>
          <p>Search, filter, and manage all registered records.</p>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .registry-hub { padding: 1.5rem; }
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
    .action-card.incoming:hover { border-color: #2e7d32; }
    .action-card.incoming:hover h3 { color: #2e7d32; }
    .action-card.outgoing:hover { border-color: #1565c0; }
    .action-card.outgoing:hover h3 { color: #1565c0; }
    .action-card.internal:hover { border-color: #f57c00; }
    .action-card.internal:hover h3 { color: #f57c00; }
    .action-card.list:hover { border-color: #6a1b9a; }
    .action-card.list:hover h3 { color: #6a1b9a; }
  `]
})
export class RegistryComponent {}
