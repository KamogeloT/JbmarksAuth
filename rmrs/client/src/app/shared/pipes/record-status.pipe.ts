import { Pipe, PipeTransform } from '@angular/core';

/**
 * Result of the record status pipe with display text and styling info.
 */
export interface StatusBadge {
  text: string;
  cssClass: string;
}

/**
 * Maps a record status string to a display label and CSS class for badge rendering.
 *
 * Usage:
 *   {{ record.status | recordStatus }}           → "Active"
 *   {{ (record.status | recordStatusBadge).cssClass }}  → "badge-active"
 *
 * Or for direct text output:
 *   {{ record.status | recordStatus }}
 */
@Pipe({
  name: 'recordStatus',
  standalone: true
})
export class RecordStatusPipe implements PipeTransform {
  private static readonly STATUS_MAP: Record<string, StatusBadge> = {
    'Active': { text: 'Active', cssClass: 'badge-active' },
    'DisposalPending': { text: 'Disposal Pending', cssClass: 'badge-warning' },
    'Disposed': { text: 'Disposed', cssClass: 'badge-danger' },
    'Archived': { text: 'Archived', cssClass: 'badge-info' },
    'TransferPending': { text: 'Transfer Pending', cssClass: 'badge-warning' }
  };

  transform(value: string | null | undefined): string {
    if (!value) return '';
    const badge = RecordStatusPipe.STATUS_MAP[value];
    return badge ? badge.text : value;
  }
}

/**
 * Returns the full StatusBadge (text + cssClass) for template styling.
 *
 * Usage:
 *   <span [class]="record.status | recordStatusBadge | statusClass">
 */
@Pipe({
  name: 'recordStatusBadge',
  standalone: true
})
export class RecordStatusBadgePipe implements PipeTransform {
  private static readonly STATUS_MAP: Record<string, StatusBadge> = {
    'Active': { text: 'Active', cssClass: 'badge-active' },
    'DisposalPending': { text: 'Disposal Pending', cssClass: 'badge-warning' },
    'Disposed': { text: 'Disposed', cssClass: 'badge-danger' },
    'Archived': { text: 'Archived', cssClass: 'badge-info' },
    'TransferPending': { text: 'Transfer Pending', cssClass: 'badge-warning' }
  };

  transform(value: string | null | undefined): StatusBadge {
    if (!value) return { text: '', cssClass: '' };
    return RecordStatusBadgePipe.STATUS_MAP[value] ?? { text: value, cssClass: 'badge-default' };
  }
}
