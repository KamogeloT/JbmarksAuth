import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Administration hub component providing navigation to sub-sections.
 * Validates: Requirements 13.1, 13.2
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="admin-hub" aria-label="System Administration">
      <h1>Administration</h1>
      <p class="subtitle">System configuration, lookup tables, and scheduled job management.</p>

      <nav class="admin-nav" aria-label="Admin sections">
        <a routerLink="config" class="nav-card" aria-label="System Configuration">
          <h3>System Configuration</h3>
          <p>OAuth settings, API URLs, and general system parameters.</p>
        </a>
        <a routerLink="lookups" class="nav-card" aria-label="Lookup Tables">
          <h3>Lookup Tables</h3>
          <p>Manage record types, classifications, storage locations, and more.</p>
        </a>
      </nav>
    </section>
  `,
  styles: [`
    .admin-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .admin-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .nav-card { display: block; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .nav-card:hover, .nav-card:focus { border-color: #1976d2; box-shadow: 0 2px 8px rgba(0,0,0,0.1); outline: none; }
    .nav-card h3 { margin: 0 0 0.5rem; font-size: 1rem; color: #1976d2; }
    .nav-card p { margin: 0; font-size: 0.875rem; color: #555; }
  `]
})
export class AdminComponent {}
