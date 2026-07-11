import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Notification severity levels.
 */
export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

/**
 * Data model for a single toast notification.
 */
export interface ToastMessage {
  id?: string;
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  duration?: number;
}

/**
 * Toast notification component that displays temporary messages.
 * Manages a stack of notifications with auto-dismiss support.
 */
@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" role="status" aria-live="polite" aria-atomic="true">
      @for (toast of messages(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.severity" role="alert">
          <div class="toast-icon" aria-hidden="true">
            @switch (toast.severity) {
              @case ('success') { &#10003; }
              @case ('error') { &#10007; }
              @case ('warning') { &#9888; }
              @case ('info') { &#8505; }
            }
          </div>
          <div class="toast-content">
            <strong class="toast-summary">{{ toast.summary }}</strong>
            @if (toast.detail) {
              <p class="toast-detail">{{ toast.detail }}</p>
            }
          </div>
          <button
            class="toast-close"
            (click)="dismiss(toast)"
            aria-label="Dismiss notification">
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; top: 1rem; right: 1rem; z-index: 2000; display: flex; flex-direction: column; gap: 0.5rem; max-width: 400px; }
    .toast { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease; }
    .toast-success { background: #e8f5e9; border-left: 4px solid #4caf50; }
    .toast-error { background: #fbe9e7; border-left: 4px solid #d32f2f; }
    .toast-warning { background: #fff3e0; border-left: 4px solid #ff9800; }
    .toast-info { background: #e3f2fd; border-left: 4px solid #1976d2; }
    .toast-icon { font-size: 1.25rem; line-height: 1; }
    .toast-content { flex: 1; }
    .toast-summary { display: block; font-size: 0.875rem; }
    .toast-detail { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #555; }
    .toast-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #666; padding: 0; line-height: 1; }
    .toast-close:hover { color: #333; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `]
})
export class NotificationToastComponent {
  /** Currently displayed toast messages */
  messages = signal<ToastMessage[]>([]);

  /**
   * Show a new toast notification.
   * Auto-dismisses after the specified duration (default 5000ms).
   */
  show(message: ToastMessage): void {
    const id = message.id ?? Math.random().toString(36).slice(2, 9);
    const toast: ToastMessage = { ...message, id };
    this.messages.update(msgs => [...msgs, toast]);

    const duration = message.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
  }

  /** Remove a toast from the stack */
  dismiss(toast: ToastMessage): void {
    this.messages.update(msgs => msgs.filter(m => m.id !== toast.id));
  }

  /** Clear all notifications */
  clearAll(): void {
    this.messages.set([]);
  }
}
