import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable confirmation dialog component.
 * Shown as an overlay modal with confirm/cancel actions.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="dialog-backdrop" (click)="onCancel()" role="presentation">
        <div
          class="dialog"
          role="alertdialog"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="messageId"
          (click)="$event.stopPropagation()">
          <h2 [id]="titleId" class="dialog-title">{{ title() }}</h2>
          <p [id]="messageId" class="dialog-message">{{ message() }}</p>
          <div class="dialog-actions">
            <button
              class="btn btn-cancel"
              (click)="onCancel()"
              type="button">
              {{ cancelLabel() }}
            </button>
            <button
              class="btn btn-confirm"
              [class.btn-danger]="variant() === 'danger'"
              (click)="onConfirm()"
              type="button"
              autofocus>
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog {
      background: #fff; border-radius: 8px; padding: 1.5rem; min-width: 320px; max-width: 480px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    }
    .dialog-title { margin: 0 0 0.75rem; font-size: 1.25rem; }
    .dialog-message { margin: 0 0 1.5rem; color: #555; line-height: 1.5; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn { padding: 0.5rem 1.25rem; border-radius: 4px; font-size: 0.875rem; cursor: pointer; border: 1px solid transparent; }
    .btn-cancel { background: #f5f5f5; border-color: #ccc; color: #333; }
    .btn-cancel:hover { background: #ebebeb; }
    .btn-confirm { background: #1976d2; color: #fff; }
    .btn-confirm:hover { background: #1565c0; }
    .btn-danger { background: #d32f2f; }
    .btn-danger:hover { background: #c62828; }
  `]
})
export class ConfirmDialogComponent {
  /** Whether the dialog is visible */
  visible = input.required<boolean>();

  /** Dialog title */
  title = input<string>('Confirm');

  /** Dialog message */
  message = input<string>('Are you sure you want to proceed?');

  /** Confirm button label */
  confirmLabel = input<string>('Confirm');

  /** Cancel button label */
  cancelLabel = input<string>('Cancel');

  /** Visual variant: 'default' or 'danger' */
  variant = input<'default' | 'danger'>('default');

  /** Emitted when user confirms */
  confirmed = output<void>();

  /** Emitted when user cancels */
  cancelled = output<void>();

  readonly titleId = `dialog-title-${Math.random().toString(36).slice(2, 9)}`;
  readonly messageId = `dialog-msg-${Math.random().toString(36).slice(2, 9)}`;

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
