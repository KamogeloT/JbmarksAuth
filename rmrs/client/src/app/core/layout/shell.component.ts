import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

/**
 * Shell component that provides the main application layout structure:
 * header bar + sidebar navigation + content area.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <div class="shell">
      <app-header></app-header>
      <div class="shell__body">
        <app-sidebar></app-sidebar>
        <main class="shell__content" id="main-content" role="main" aria-label="Main content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .shell__body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .shell__content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
  `]
})
export class ShellComponent {}
