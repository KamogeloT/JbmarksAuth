import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Login page component displaying a "Sign in with Bitrix" button.
 * Initiates the OAuth redirect flow to Bitrix SDinMotion.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login" role="main">
      <div class="login__card">
        <div class="login__header">
          <h1 class="login__title">RMRS</h1>
          <p class="login__subtitle">Records Management & Registry System</p>
          <p class="login__description">JB Marks Local Municipality</p>
        </div>

        <div class="login__actions">
          <button
            class="login__btn"
            (click)="onSignIn()"
            [disabled]="isLoading"
            aria-label="Sign in with Bitrix SDinMotion">
            @if (isLoading) {
              <span class="login__spinner" aria-hidden="true"></span>
              Redirecting...
            } @else {
              Sign in with Bitrix
            }
          </button>
        </div>

        @if (errorMessage) {
          <div class="login__error" role="alert" aria-live="polite">
            {{ errorMessage }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .login {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%);
      padding: 24px;
    }
    .login__card {
      background: #fff;
      border-radius: 8px;
      padding: 48px 40px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .login__header {
      margin-bottom: 32px;
    }
    .login__title {
      margin: 0 0 8px;
      font-size: 2rem;
      color: #1976d2;
      font-weight: 700;
    }
    .login__subtitle {
      margin: 0 0 4px;
      font-size: 1rem;
      color: #333;
    }
    .login__description {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
    }
    .login__actions {
      margin-bottom: 16px;
    }
    .login__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      background-color: #1976d2;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .login__btn:hover:not(:disabled) {
      background-color: #1565c0;
    }
    .login__btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .login__spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .login__error {
      margin-top: 16px;
      padding: 12px;
      background: #fdecea;
      color: #c62828;
      border-radius: 4px;
      font-size: 0.85rem;
    }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  isLoading = false;
  errorMessage: string | null = null;

  constructor() {
    // Check for error query param (e.g., from failed OAuth callback)
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['error'] === 'session_expired'
          ? 'Your session has expired. Please sign in again.'
          : 'Authentication failed. Please try again.';
      }
    });
  }

  onSignIn(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.authService.login();
  }
}
