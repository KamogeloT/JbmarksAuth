import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { StorageLocation } from '../../shared/models';
import { LocationTreeComponent } from './location-tree.component';

/**
 * Component for moving physical records to new locations.
 * Supports both single record moves and bulk move operations.
 */
@Component({
  selector: 'app-move-record',
  standalone: true,
  imports: [CommonModule, LocationTreeComponent],
  template: `
    <div class="move-record" aria-label="Move physical record to new location">
      <h2>Move Record{{ isBulk() ? 's' : '' }}</h2>

      @if (isBulk()) {
        <p class="move-info">
          Moving {{ physicalRecordIds.length }} record(s) to a new location.
          Select the destination location from the tree below.
        </p>
      } @else {
        <p class="move-info">
          Select a new location for this physical record.
        </p>
      }

      <!-- Current Info -->
      @if (!isBulk() && currentLocationName()) {
        <div class="current-location" aria-label="Current location information">
          <span class="location-label">Current Location:</span>
          <span class="location-value">{{ currentLocationName() }}</span>
        </div>
      }

      <!-- Destination Location Selection -->
      <div class="destination-section">
        <h3>Select Destination</h3>
        <app-location-tree
          [selectable]="true"
          (locationSelected)="onLocationSelected($event)" />
      </div>

      @if (selectedDestination()) {
        <div class="selected-destination" aria-live="polite">
          <span class="destination-label">Moving to:</span>
          <span class="destination-value">
            {{ selectedDestination()!.locationName }} ({{ selectedDestination()!.locationCode }}) - {{ selectedDestination()!.locationType }}
          </span>
        </div>
      }

      @if (moveError()) {
        <div class="move-error" role="alert">{{ moveError() }}</div>
      }

      @if (moveSuccess()) {
        <div class="move-success" role="status">
          {{ isBulk() ? 'All records moved successfully!' : 'Record moved successfully!' }}
        </div>
      }

      <div class="move-actions">
        <button
          class="btn btn-primary"
          (click)="executeMove()"
          [disabled]="!selectedDestination() || moving()"
          aria-label="Confirm move to selected location">
          {{ moving() ? 'Moving...' : (isBulk() ? 'Move All Records' : 'Move Record') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .move-record { padding: 1.5rem; }
    h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    h3 { margin: 0 0 0.75rem; font-size: 1rem; }
    .move-info { font-size: 0.875rem; color: #666; margin: 0 0 1.5rem; }
    .current-location { background: #f5f5f5; padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .location-label { font-weight: 500; font-size: 0.875rem; }
    .location-value { font-size: 0.875rem; color: #333; }
    .destination-section { margin-bottom: 1.5rem; }
    .selected-destination { background: #e3f2fd; padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .destination-label { font-weight: 500; font-size: 0.875rem; color: #1565c0; }
    .destination-value { font-size: 0.875rem; color: #1976d2; }
    .move-error { background: #ffebee; color: #c62828; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .move-success { background: #e8f5e9; color: #2e7d32; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .move-actions { display: flex; justify-content: flex-end; }
    .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class MoveRecordComponent {
  /** For single move: the physical record ID */
  @Input() physicalRecordId: number | null = null;

  /** For bulk move: array of physical record IDs */
  @Input() physicalRecordIds: number[] = [];

  /** Current location name (for display purposes) */
  @Input() currentLocationName = signal<string>('');

  private readonly api = inject(ApiService);

  selectedDestination = signal<StorageLocation | null>(null);
  moving = signal<boolean>(false);
  moveError = signal<string>('');
  moveSuccess = signal<boolean>(false);

  isBulk(): boolean {
    return this.physicalRecordIds.length > 1;
  }

  onLocationSelected(location: StorageLocation): void {
    this.selectedDestination.set(location);
    this.moveError.set('');
    this.moveSuccess.set(false);
  }

  executeMove(): void {
    const destination = this.selectedDestination();
    if (!destination) return;

    this.moving.set(true);
    this.moveError.set('');
    this.moveSuccess.set(false);

    if (this.isBulk()) {
      // Bulk move
      const payload = {
        physicalRecordIds: this.physicalRecordIds,
        newLocationId: destination.id
      };
      this.api.post('/physical-records/bulk-move', payload).subscribe({
        next: () => {
          this.moving.set(false);
          this.moveSuccess.set(true);
        },
        error: (err) => {
          this.moving.set(false);
          this.moveError.set(err.error?.message || 'Failed to move records. Please try again.');
        }
      });
    } else if (this.physicalRecordId) {
      // Single move
      const payload = { newLocationId: destination.id };
      this.api.post(`/physical-records/${this.physicalRecordId}/move`, payload).subscribe({
        next: () => {
          this.moving.set(false);
          this.moveSuccess.set(true);
        },
        error: (err) => {
          this.moving.set(false);
          this.moveError.set(err.error?.message || 'Failed to move record. Please try again.');
        }
      });
    }
  }
}
