import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { StorageLocation } from '../../shared/models';

/**
 * Component displaying the storage location hierarchy as an expandable tree.
 * Supports Building > Floor > Room > Shelf > Position hierarchy.
 */
@Component({
  selector: 'app-location-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="location-tree" role="tree" aria-label="Storage location hierarchy">
      <div class="tree-header">
        <h3>Storage Locations</h3>
      </div>

      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">Loading locations...</div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadLocations()">Retry</button>
        </div>
      } @else {
        <div class="tree-content">
          @for (location of locations(); track location.id) {
            <div class="location-node-wrapper">
              <app-location-node-internal
                [location]="location"
                [expandedIds]="expandedIds()"
                [selectedId]="selectedLocationId()"
                (toggle)="toggleNode($event)"
                (selectLocation)="onSelectLocation($event)" />
            </div>
          } @empty {
            <p class="empty-state">No storage locations defined.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .location-tree { padding: 1rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
    .tree-header { margin-bottom: 1rem; }
    .tree-header h3 { margin: 0; font-size: 1rem; }
    .loading { text-align: center; padding: 1.5rem; color: #666; }
    .error-state { text-align: center; padding: 1.5rem; color: #d32f2f; }
    .btn-secondary { padding: 0.375rem 0.75rem; background: #f5f5f5; border: 1px solid #ccc; color: #333; border-radius: 4px; cursor: pointer; }
    .tree-content { border: 1px solid #f0f0f0; border-radius: 4px; max-height: 400px; overflow-y: auto; }
    .empty-state { text-align: center; padding: 2rem; color: #666; }
  `]
})
export class LocationTreeComponent implements OnInit {
  @Input() selectable = true;
  @Output() locationSelected = new EventEmitter<StorageLocation>();

  private readonly api = inject(ApiService);

  locations = signal<StorageLocation[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  expandedIds = signal<Set<number>>(new Set());
  selectedLocationId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadLocations();
  }

  loadLocations(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<StorageLocation[]>('/storage-locations').subscribe({
      next: (locations) => {
        this.locations.set(locations);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load storage locations.');
        this.loading.set(false);
      }
    });
  }

  toggleNode(locationId: number): void {
    this.expandedIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(locationId)) {
        newIds.delete(locationId);
      } else {
        newIds.add(locationId);
      }
      return newIds;
    });
  }

  onSelectLocation(location: StorageLocation): void {
    this.selectedLocationId.set(location.id);
    this.locationSelected.emit(location);
  }
}

/**
 * Internal recursive component for rendering location tree nodes.
 */
@Component({
  selector: 'app-location-node-internal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="location-node"
      [class.selected]="selectedId === location.id"
      [class.inactive]="!location.isActive"
      role="treeitem"
      [attr.aria-expanded]="hasChildren ? isExpanded : undefined"
      [attr.aria-selected]="selectedId === location.id"
      [attr.aria-label]="location.locationName + ' (' + location.locationType + ')'">

      <div class="node-content" (click)="selectLocation.emit(location)" tabindex="0" (keydown.enter)="selectLocation.emit(location)">
        @if (hasChildren) {
          <button
            class="expand-btn"
            (click)="toggle.emit(location.id); $event.stopPropagation()"
            [attr.aria-label]="isExpanded ? 'Collapse ' + location.locationName : 'Expand ' + location.locationName">
            {{ isExpanded ? '&#9660;' : '&#9654;' }}
          </button>
        } @else {
          <span class="expand-spacer"></span>
        }

        <span class="location-type-icon" aria-hidden="true">{{ getTypeIcon(location.locationType) }}</span>
        <span class="location-name">{{ location.locationName }}</span>
        <span class="location-code">({{ location.locationCode }})</span>
        <span class="location-type-badge">{{ location.locationType }}</span>
      </div>
    </div>

    @if (isExpanded && location.children && location.children.length > 0) {
      <div class="children-container" [style.padding-left.rem]="1">
        @for (child of location.children; track child.id) {
          <app-location-node-internal
            [location]="child"
            [expandedIds]="expandedIds"
            [selectedId]="selectedId"
            (toggle)="toggle.emit($event)"
            (selectLocation)="selectLocation.emit($event)" />
        }
      </div>
    }
  `,
  styles: [`
    .location-node { border-bottom: 1px solid #f5f5f5; }
    .location-node.selected { background: #e3f2fd; }
    .location-node.inactive { opacity: 0.5; }
    .node-content { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; cursor: pointer; }
    .node-content:hover { background: #fafafa; }
    .expand-btn { background: none; border: none; cursor: pointer; width: 1.25rem; font-size: 0.625rem; padding: 0; }
    .expand-spacer { width: 1.25rem; display: inline-block; }
    .location-type-icon { font-size: 1rem; }
    .location-name { font-size: 0.875rem; font-weight: 500; }
    .location-code { font-size: 0.75rem; color: #666; font-family: monospace; }
    .location-type-badge { font-size: 0.625rem; background: #e0e0e0; padding: 0.125rem 0.375rem; border-radius: 3px; margin-left: auto; }
    .children-container { border-left: 1px solid #e0e0e0; margin-left: 0.75rem; }
  `]
})
export class LocationNodeInternalComponent {
  @Input() location!: StorageLocation;
  @Input() expandedIds!: Set<number>;
  @Input() selectedId: number | null = null;
  @Output() toggle = new EventEmitter<number>();
  @Output() selectLocation = new EventEmitter<StorageLocation>();

  get isExpanded(): boolean {
    return this.expandedIds.has(this.location.id);
  }

  get hasChildren(): boolean {
    return !!(this.location.children && this.location.children.length > 0);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      Building: '\u{1F3E2}',
      Floor: '\u{1F4C2}',
      Room: '\u{1F6AA}',
      Shelf: '\u{1F4DA}',
      Position: '\u{1F4CD}'
    };
    return icons[type] || '\u{1F4C1}';
  }
}
