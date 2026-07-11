import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

/**
 * Application header showing the system title and current user info.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header" role="banner">
      <div class="header__title">
        <h1>RMRS</h1>
        <span class="header__subtitle">Records Management & Registry System</span>
      </div>
      <div class="header__user" *ngIf="auth.currentUser() as user">
        <span class="header__username">{{ user.fullName }}</span>
        <button
          class="header__logout-btn"
          (click)="onLogout()"
          aria-label="Log out">
          Logout
        </button>
      </div>
    </header>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--header-height, 64px);
      padding: 0 24px;
      background-color: var(--primary-color, #1976d2);
      color: #fff;
    }
    .header__title {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .header__title h1 {
      margin: 0;
      font-size: 1.4rem;
    }
    .header__subtitle {
      font-size: 0.85rem;
      opacity: 0.85;
    }
    .header__user {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header__username {
      font-size: 0.9rem;
    }
    .header__logout-btn {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .header__logout-btn:hover {
      background: rgba(255,255,255,0.25);
    }
  `]
})
export class HeaderComponent {
  readonly auth = inject(AuthService);

  onLogout(): void {
    this.auth.logout().subscribe();
  }
}
