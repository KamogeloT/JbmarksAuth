import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { FilePlanTree, FilePlanTreeNode } from '../../shared/models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ClassificationLevelPipe } from '../../shared/pipes';

/**
 * Internal recursive tree node component for rendering nested file plan entries.
 */
@Component({
  selector: 'app-tree-node-internal',
  standalone: true,
  imports: [CommonModule, ClassificationLevelPipe],
  template: `
    <div
      class="tree-node"
      [class.selected]="selectedId === node.id"
      [class.deactivated]="!node.isActive"
      [style.padding-left.rem]="(node.level - 1) * 1.5"
      role="treeitem"
      [attr.aria-expanded]="node.children.length > 0 ? isExpanded : undefined"
      [attr.aria-selected]="selectedId === node.id"
      [attr.aria-label]="node.classificationCode + ' - ' + node.title">

      <div class="node-content" (click)="select.emit(node)" tabindex="0" (keydown.enter)="select.emit(node)">
        @if (node.children.length > 0) {
          <button
            class="expand-btn"
            (click)="toggle.emit(node.id); $event.stopPropagation()"
            [attr.aria-label]="isExpanded ? 'Collapse ' + node.title : 'Expand ' + node.title">
            {{ isExpanded ? '&#9660;' : '&#9654;' }}
          </button>
        } @else {
          <span class="expand-spacer"></span>
        }

        <div class="node-info">
          <span class="classification-code">{{ node.classificationCode }}</span>
          <span class="node-title">{{ node.title }}</span>
          @if (!node.isActive) {
            <span class="deactivated-badge" aria-label="Deactivated">Inactive</span>
          }
        </div>

        <div class="node-meta">
          <span class="level-badge">L{{ node.level }}</span>
          <span class="classification-level">{{ node.defaultClassificationLevel | classificationLevel }}</span>
        </div>

        <div class="node-actions">
          @if (node.isActive && node.level < 5) {
            <button
              class="action-btn"
              (click)="createChild.emit(node); $event.stopPropagation()"
              aria-label="Add child entry under {{ node.title }}">
              +
            </button>
          }
          @if (node.isActive) {
            <button
              class="action-btn action-btn-danger"
              (click)="deactivate.emit(node); $event.stopPropagation()"
              aria-label="Deactivate {{ node.title }}">
              &#x2715;
            </button>
          }
        </div>
      </div>
    </div>

    @if (isExpanded && node.children.length > 0) {
      @for (child of node.children; track child.id) {
        <app-tree-node-internal
          [node]="child"
          [expandedIds]="expandedIds"
          [selectedId]="selectedId"
          (toggle)="toggle.emit($event)"
          (select)="select.emit($event)"
          (deactivate)="deactivate.emit($event)"
          (createChild)="createChild.emit($event)" />
      }
    }
  `,
  styles: [`
    .tree-node { border-bottom: 1px solid #f0f0f0; }
    .tree-node.selected { background: #e3f2fd; }
    .tree-node.deactivated { opacity: 0.6; }
    .node-content { display: flex; align-items: center; padding: 0.5rem 0.75rem; cursor: pointer; gap: 0.5rem; }
    .node-content:hover { background: #fafafa; }
    .expand-btn { background: none; border: none; cursor: pointer; width: 1.5rem; font-size: 0.75rem; padding: 0; }
    .expand-spacer { width: 1.5rem; display: inline-block; }
    .node-info { flex: 1; display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
    .classification-code { font-weight: 600; font-size: 0.8125rem; color: #1976d2; white-space: nowrap; }
    .node-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .deactivated-badge { font-size: 0.6875rem; background: #ffcdd2; color: #c62828; padding: 0.125rem 0.5rem; border-radius: 4px; }
    .node-meta { display: flex; gap: 0.5rem; align-items: center; }
    .level-badge { font-size: 0.6875rem; background: #e0e0e0; padding: 0.125rem 0.375rem; border-radius: 3px; }
    .classification-level { font-size: 0.75rem; color: #666; }
    .node-actions { display: flex; gap: 0.25rem; }
    .action-btn { background: none; border: 1px solid #ccc; border-radius: 3px; width: 1.5rem; height: 1.5rem; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
    .action-btn:hover { background: #e0e0e0; }
    .action-btn-danger:hover { background: #ffcdd2; border-color: #d32f2f; color: #d32f2f; }
  `]
})
export class TreeNodeInternalComponent {
  @Input() node!: FilePlanTreeNode;
  @Input() expandedIds!: Set<number>;
  @Input() selectedId: number | null = null;
  @Output() toggle = new EventEmitter<number>();
  @Output() select = new EventEmitter<FilePlanTreeNode>();
  @Output() deactivate = new EventEmitter<FilePlanTreeNode>();
  @Output() createChild = new EventEmitter<FilePlanTreeNode>();

  get isExpanded(): boolean {
    return this.expandedIds.has(this.node.id);
  }
}

/**
 * Displays the hierarchical file plan tree with expand/collapse functionality.
 * Allows navigation, selection, and deactivation of file plan entries.
 */
@Component({
  selector: 'app-file-plan-tree',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, ClassificationLevelPipe, TreeNodeInternalComponent],
  template: `
    <div class="file-plan-tree" role="tree" aria-label="File plan hierarchy">
      <div class="tree-header">
        <h2>File Plan Structure</h2>
        <button class="btn btn-primary" (click)="onCreateEntry()" aria-label="Create new file plan entry">
          + New Entry
        </button>
      </div>

      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">
          <span>Loading file plan...</span>
        </div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadTree()">Retry</button>
        </div>
      } @else {
        <div class="tree-content">
          @for (node of treeNodes(); track node.id) {
            <app-tree-node-internal
              [node]="node"
              [expandedIds]="expandedIds()"
              [selectedId]="selectedNodeId()"
              (toggle)="toggleNode($event)"
              (select)="selectNode($event)"
              (deactivate)="confirmDeactivation($event)"
              (createChild)="onCreateChild($event)" />
          } @empty {
            <p class="empty-state">No file plan entries found. Click "New Entry" to create one.</p>
          }
        </div>
      }
    </div>

    <app-confirm-dialog
      [visible]="showDeactivateDialog()"
      title="Deactivate File Plan Entry"
      [message]="deactivateMessage()"
      confirmLabel="Deactivate"
      cancelLabel="Cancel"
      variant="danger"
      (confirmed)="executeDeactivation()"
      (cancelled)="showDeactivateDialog.set(false)" />
  `,
  styles: [`
    .file-plan-tree { padding: 1rem; }
    .tree-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .tree-header h2 { margin: 0; font-size: 1.25rem; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-secondary { background: #f5f5f5; border: 1px solid #ccc; color: #333; }
    .loading { text-align: center; padding: 2rem; color: #666; }
    .error-state { text-align: center; padding: 2rem; color: #d32f2f; }
    .empty-state { text-align: center; padding: 2rem; color: #666; }
    .tree-content { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
  `]
})
export class FilePlanTreeComponent implements OnInit {
  private readonly api = inject(ApiService);

  treeNodes = signal<FilePlanTreeNode[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  expandedIds = signal<Set<number>>(new Set());
  selectedNodeId = signal<number | null>(null);
  showDeactivateDialog = signal<boolean>(false);
  deactivateMessage = signal<string>('');
  nodeToDeactivate = signal<FilePlanTreeNode | null>(null);

  /** Signals for parent component coordination */
  createEntryRequested = signal<{ parentId: number | null }>({ parentId: null });
  selectedNode = signal<FilePlanTreeNode | null>(null);

  ngOnInit(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<FilePlanTree>('/file-plan/tree').subscribe({
      next: (tree) => {
        this.treeNodes.set(tree.entries);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load file plan tree. Please try again.');
        this.loading.set(false);
      }
    });
  }

  toggleNode(nodeId: number): void {
    this.expandedIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(nodeId)) {
        newIds.delete(nodeId);
      } else {
        newIds.add(nodeId);
      }
      return newIds;
    });
  }

  selectNode(node: FilePlanTreeNode): void {
    this.selectedNodeId.set(node.id);
    this.selectedNode.set(node);
  }

  onCreateEntry(): void {
    this.createEntryRequested.set({ parentId: null });
  }

  onCreateChild(parentNode: FilePlanTreeNode): void {
    this.createEntryRequested.set({ parentId: parentNode.id });
  }

  confirmDeactivation(node: FilePlanTreeNode): void {
    this.nodeToDeactivate.set(node);
    this.deactivateMessage.set(
      `Are you sure you want to deactivate "${node.title}" (${node.classificationCode})? ` +
      `New records will no longer be classified under this entry. Existing records will remain accessible.`
    );
    this.showDeactivateDialog.set(true);
  }

  executeDeactivation(): void {
    const node = this.nodeToDeactivate();
    if (!node) return;

    this.api.post(`/file-plan/entries/${node.id}/deactivate`).subscribe({
      next: () => {
        this.showDeactivateDialog.set(false);
        this.nodeToDeactivate.set(null);
        this.loadTree();
      },
      error: (err) => {
        this.showDeactivateDialog.set(false);
        this.error.set(err.error?.message || 'Failed to deactivate entry. It may have active records.');
      }
    });
  }
}
