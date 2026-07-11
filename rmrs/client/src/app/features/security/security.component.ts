import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Security hub component providing navigation to role management and department mapping.
 * Validates: Requirements 10.1, 10.4
 */
@Component({
  selector: 'app-security',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="security-hub" aria-label="Security and Access Control">
      <h1>Security</h1>
      <p class="subtitle">Role management, department isolation, and access control configuration.</p>

      <nav class="security-nav" aria-label="Security sections">
        <a routerLink="roles" class="nav-card" aria-label="Role Management">
          <h3>Role Management</h3>
          <p>Assign and revoke roles for users with justification.</p>
        </a>
        <a routerLink="departments" class="nav-card" aria-label="Department Mappings">
          <h3>Department Mappings</h3>
          <p>Map departments to Bitrix workgroup drives.</p>
        </a>
      </nav>
    </section>
  `,
  styles: [`
    .security-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .security-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .nav-card { display: block; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .nav-card:hover, .nav-card:focus { border-color: #1976d2; box-shadow: 0 2px 8px rgba(0,0,0,0.1); outline: none; }
    .nav-card h3 { margin: 0 0 0.5rem; font-size: 1rem; color: #1976d2; }
    .nav-card p { margin: 0; font-size: 0.875rem; color: #555; }
  `]
})
export class SecurityComponent {}
