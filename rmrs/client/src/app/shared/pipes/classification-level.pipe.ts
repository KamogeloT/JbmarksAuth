import { Pipe, PipeTransform } from '@angular/core';

/**
 * Maps a numeric classification level to its display label.
 *
 * Level mapping:
 *   0 → Public
 *   1 → Internal
 *   2 → Confidential
 *   3 → Restricted
 *
 * Usage:
 *   {{ record.classificationLevel | classificationLevel }}  → "Confidential"
 */
@Pipe({
  name: 'classificationLevel',
  standalone: true
})
export class ClassificationLevelPipe implements PipeTransform {
  private static readonly LEVELS: Record<number, string> = {
    0: 'Public',
    1: 'Internal',
    2: 'Confidential',
    3: 'Restricted'
  };

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return ClassificationLevelPipe.LEVELS[value] ?? `Level ${value}`;
  }
}
