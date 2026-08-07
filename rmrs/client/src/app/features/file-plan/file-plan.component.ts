import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

@Component({
  selector: 'app-file-plan',
  standalone: true,
  imports: [RouterLink, HelpBannerComponent],
  template: `
    <section class="file-plan-hub" aria-label="File Plan Management">
      <h1>File Plan Management</h1>
      <p class="subtitle">Define the hierarchical classification structure for all records.</p>

      <app-help-banner
        title="File Plan Guide"
        [tips]="[
          'The file plan defines how records are classified and organised.',
          'Create a tree structure with series, sub-series, and file references.',
          'Each entry has a classification code (e.g., 1/2/1) and a retention rule.',
          'Retention rules determine how long records must be kept before disposal.',
          'The file plan is used by the Registry module when registering new records.'
        ]">
      </app-help-banner>

      <div class="action-cards">
        <a routerLink="tree" class="action-card" aria-label="Browse File Plan Tree">
          <span class="card-icon">🌳</span>
          <h3>File Plan Tree</h3>
          <p>Browse, create, and edit the hierarchical classification structure.</p>
        </a>

        <a routerLink="retention-rules" class="action-card" aria-label="Retention Rules">
          <span class="card-icon">⏱️</span>
          <h3>Retention Rules</h3>
          <p>Define how long records must be retained before they can be disposed of or archived.</p>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .file-plan-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .action-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
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
  `]
})
export class FilePlanComponent {}
