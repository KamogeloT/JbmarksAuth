import { Component, Input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { DocumentVersion } from '../../shared/models';
import { DateFormatPipe } from '../../shared/pipes';

/**
 * Component showing version history of a document with checksums.
 * Displays all versions with their metadata including SHA-256 checksums.
 */
@Component({
  selector: 'app-document-version-list',
  standalone: true,
  imports: [CommonModule, DateFormatPipe],
  template: `
    <div class="version-list" aria-label="Document version history">
      <h3>Version History</h3>

      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">Loading version history...</div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadVersions()">Retry</button>
        </div>
      } @else {
        <div class="versions-table" role="table" aria-label="Document versions">
          <div class="table-header" role="row">
            <span class="col-version" role="columnheader">Version</span>
            <span class="col-date" role="columnheader">Uploaded</span>
            <span class="col-user" role="columnheader">User</span>
            <span class="col-size" role="columnheader">Size</span>
            <span class="col-checksum" role="columnheader">SHA-256 Checksum</span>
            <span class="col-actions" role="columnheader">Actions</span>
          </div>

          @for (version of versions(); track version.id) {
            <div class="table-row" role="row" [class.current-version]="version.versionNumber === currentVersion()">
              <span class="col-version" role="cell">
                v{{ version.versionNumber }}
                @if (version.versionNumber === currentVersion()) {
                  <span class="current-badge" aria-label="Current version">Current</span>
                }
              </span>
              <span class="col-date" role="cell">{{ version.uploadedAt | dateFormat:'long' }}</span>
              <span class="col-user" role="cell">User #{{ version.uploadedByUserId }}</span>
              <span class="col-size" role="cell">{{ formatFileSize(version.fileSize) }}</span>
              <span class="col-checksum" role="cell" [title]="version.sha256Checksum">
                {{ version.sha256Checksum | slice:0:16 }}...
                <button
                  class="copy-btn"
                  (click)="copyChecksum(version.sha256Checksum)"
                  aria-label="Copy full checksum">
                  Copy
                </button>
              </span>
              <span class="col-actions" role="cell">
                <button class="btn btn-sm" (click)="downloadVersion(version)" aria-label="Download version {{ version.versionNumber }}">
                  Download
                </button>
              </span>
            </div>
          } @empty {
            <div class="empty-state" role="row">
              <span role="cell">No versions found for this document.</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .version-list { padding: 1.5rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
    h3 { margin: 0 0 1rem; font-size: 1.125rem; }
    .loading { text-align: center; padding: 1.5rem; color: #666; }
    .error-state { text-align: center; padding: 1.5rem; color: #d32f2f; }
    .versions-table { display: flex; flex-direction: column; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
    .table-header { display: flex; padding: 0.625rem 1rem; background: #f5f5f5; font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid #e0e0e0; }
    .table-row { display: flex; padding: 0.625rem 1rem; font-size: 0.8125rem; border-bottom: 1px solid #f0f0f0; align-items: center; }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: #fafafa; }
    .table-row.current-version { background: #e3f2fd; }
    .col-version { flex: 0 0 100px; display: flex; align-items: center; gap: 0.5rem; }
    .col-date { flex: 0 0 180px; }
    .col-user { flex: 0 0 100px; }
    .col-size { flex: 0 0 80px; }
    .col-checksum { flex: 1; display: flex; align-items: center; gap: 0.5rem; font-family: monospace; font-size: 0.75rem; }
    .col-actions { flex: 0 0 90px; text-align: right; }
    .current-badge { font-size: 0.625rem; background: #1976d2; color: #fff; padding: 0.125rem 0.375rem; border-radius: 3px; }
    .copy-btn { background: none; border: 1px solid #ccc; border-radius: 3px; padding: 0.125rem 0.375rem; cursor: pointer; font-size: 0.6875rem; }
    .copy-btn:hover { background: #e0e0e0; }
    .btn-sm { padding: 0.25rem 0.625rem; background: #1976d2; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
    .btn-sm:hover { background: #1565c0; }
    .btn-secondary { padding: 0.375rem 0.75rem; background: #f5f5f5; border: 1px solid #ccc; color: #333; border-radius: 4px; cursor: pointer; }
    .empty-state { text-align: center; padding: 2rem; color: #666; }
  `]
})
export class DocumentVersionListComponent implements OnInit {
  @Input() documentId!: number;
  @Input() currentVersion = signal<number>(1);

  private readonly api = inject(ApiService);

  versions = signal<DocumentVersion[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    this.loadVersions();
  }

  loadVersions(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<DocumentVersion[]>(`/documents/${this.documentId}/versions`).subscribe({
      next: (versions) => {
        // Sort by version number descending (newest first)
        this.versions.set(versions.sort((a, b) => b.versionNumber - a.versionNumber));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load version history.');
        this.loading.set(false);
      }
    });
  }

  downloadVersion(version: DocumentVersion): void {
    this.api.download(`/documents/${this.documentId}/download?version=${version.versionNumber}`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `document_v${version.versionNumber}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  copyChecksum(checksum: string): void {
    navigator.clipboard.writeText(checksum).catch(() => {
      // Fallback: create temporary input
      const input = document.createElement('input');
      input.value = checksum;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }
}
