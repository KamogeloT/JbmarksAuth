import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-banner" [class.expanded]="isExpanded">
      <button class="help-banner__toggle" (click)="isExpanded = !isExpanded" [attr.aria-label]="'Toggle help for ' + title">
        <span class="help-banner__icon">💡</span>
        <span class="help-banner__title">{{ title }}</span>
        <span class="help-banner__arrow">{{ isExpanded ? '▲' : '▼' }}</span>
      </button>
      <div class="help-banner__content" *ngIf="isExpanded">
        <ul class="help-banner__tips">
          <li *ngFor="let tip of tips">{{ tip }}</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .help-banner { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
    .help-banner__toggle { display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #0369a1; font-weight: 500; }
    .help-banner__icon { font-size: 18px; }
    .help-banner__arrow { margin-left: auto; font-size: 12px; }
    .help-banner__content { padding: 0 16px 12px; }
    .help-banner__tips { margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.8; }
  `]
})
export class HelpBannerComponent {
  @Input() title = 'How to use this page';
  @Input() tips: string[] = [];
  isExpanded = false;
}
