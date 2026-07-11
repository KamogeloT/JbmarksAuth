import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Disposal hub component providing navigation to disposal sub-sections.
 * Validates: Requirements 7.2, 7.3, 7.4
 */
@Component({
  selector: 'app-disposal',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="disposal-hub" aria-label="Retention and Disposal">
      <h1>Retention & Disposal</h1>
      <p class="subtitle">Disposal candidate management and approval workflow interface.</p>

      <nav class="disposal-nav" aria-label="Disposal sections">
        <a routerLink="candidates" class="nav-card" aria-label="Disposal Candidates">
          <h3>Disposal Candidates</h3>
          <p>View records with expired retention periods eligible for disposal.</p>
        </a>
        <a routerLink="batch" class="nav-card" aria-label="Create Disposal Batch">
          <h3>Create Batch</h3>
          <p>Initiate a new disposal batch for approval and execution.</p>
        </a>
      </nav>
    </section>
  `,
  styles: [`
    .disposal-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .disposal-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .nav-card { display: block; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .nav-card:hover, .nav-card:focus { border-color: #1976d2; box-shadow: 0 2px 8px rgba(0,0,0,0.1); outline: none; }
    .nav-card h3 { margin: 0 0 0.5rem; font-size: 1rem; color: #1976d2; }
    .nav-card p { margin: 0; font-size: 0.875rem; color: #555; }
  `]
})
export class DisposalComponent {}
