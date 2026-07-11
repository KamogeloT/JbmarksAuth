import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Access denied page shown when a user attempts to access a resource
 * or route they don't have permissions for (403 Forbidden).
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="access-denied" role="main">
      <div class="access-denied__card">
        <div class="access-denied__icon" aria-hidden="true">&#x1F6AB;</div>
        <h1 class="access-denied__title">Access Denied</h1>
        <p class="access-denied__message">
          You do not have the required permissions to access this page.
          Please contact your System Administrator if you believe this is an error.
        </p>
        <a routerLink="/dashboard" class="access-denied__link" aria-label="Return to dashboard">
          Return to Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [`
    .access-denied {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      background: #f5f5f5;
    }
    .access-denied__card {
      background: #fff;
      border-radius: 8px;
      padding: 48px 40px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .access-denied__icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .access-denied__title {
      margin: 0 0 12px;
      font-size: 1.5rem;
      color: #c62828;
    }
    .access-denied__message {
      margin: 0 0 24px;
      color: #555;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .access-denied__link {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1976d2;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .access-denied__link:hover {
      background-color: #1565c0;
    }
  `]
})
export class AccessDeniedComponent {}
