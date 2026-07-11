import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Archive hub component providing navigation to transfer batch management.
 * Validates: Requirements 8.1, 8.3
 */
@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="archive-hub" aria-label="Archive Transfer">
      <h1>Archive Transfer</h1>
      <p class="subtitle">Transfer batch creation, validation, and manifest generation interface.</p>

      <nav class="archive-nav" aria-label="Archive sections">
        <a routerLink="batch" class="nav-card" aria-label="Create Transfer Batch">
          <h3>Create Transfer Batch</h3>
          <p>Start a new archive transfer batch for National Archives.</p>
        </a>
      </nav>
    </section>
  `,
  styles: [`
    .archive-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .archive-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .nav-card { display: block; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .nav-card:hover, .nav-card:focus { border-color: #1976d2; box-shadow: 0 2px 8px rgba(0,0,0,0.1); outline: none; }
    .nav-card h3 { margin: 0 0 0.5rem; font-size: 1rem; color: #1976d2; }
    .nav-card p { margin: 0; font-size: 0.875rem; color: #555; }
  `]
})
export class ArchiveComponent {}
