import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats date strings consistently across the application.
 * Accepts ISO date strings or Date objects.
 *
 * Usage:
 *   {{ record.createdAt | dateFormat }}         → "15 Jan 2024"
 *   {{ record.createdAt | dateFormat:'long' }}  → "15 January 2024, 14:30"
 *   {{ record.createdAt | dateFormat:'short' }} → "15/01/2024"
 */
@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: 'default' | 'long' | 'short' = 'default'): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date.getTime())) return '';

    switch (format) {
      case 'long':
        return date.toLocaleDateString('en-ZA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) + ', ' + date.toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit'
        });

      case 'short':
        return date.toLocaleDateString('en-ZA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

      case 'default':
      default:
        return date.toLocaleDateString('en-ZA', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
    }
  }
}
