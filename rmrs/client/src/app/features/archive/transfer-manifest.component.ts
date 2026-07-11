import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@core/api';

/**
 * Component for downloading transfer manifest PDF for a finalized archive transfer batch.
 * Validates: Requirements 8.3
 */
@Component({
  selector: 'app-transfer-manifest',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="transfer-manifest" aria-label="Transfer Manifest">
      <header class="page-header">
        <h1>Transfer Manifest</h1>
        <p class="subtitle">Download the transfer manifest for the finalized archive transfer batch.</p>
      </header>

      @if (downloading()) {
        <div class="loading" role="status" aria-label="Downloading manifest">
          <p>Preparing manifest PDF...</p>
        </div>
      } @else if (error()) {
        <p class="error-message" role="alert">{{ error() }}</p>
      } @else {
        <div class="manifest-card">
          <p>Batch ID: <strong>{{ batchId() }}</strong></p>
          <p>The transfer manifest includes batch number, transfer date, destination archive, record list with metadata, and total record count.</p>
          <button
            class="btn-primary"
            (click)="downloadManifest()"
            aria-label="Download transfer manifest as PDF">
            Download Manifest (PDF)
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    .transfer-manifest { padding: 1.5rem; max-width: 600px; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .error-message { color: #d32f2f; }
    .manifest-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; }
    .manifest-card p { margin: 0 0 0.75rem; color: #444; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; margin-top: 0.5rem; }
  `]
})
export class TransferManifestComponent implements OnInit {
  batchId = signal<number | null>(null);
  downloading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.batchId.set(+id);
    }
  }

  downloadManifest(): void {
    if (!this.batchId()) return;
    this.downloading.set(true);
    this.error.set(null);

    this.api.download(`/archive/batches/${this.batchId()}/manifest`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transfer-manifest-batch-${this.batchId()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.error.set('Failed to download manifest. The batch may not be finalized yet.');
        this.downloading.set(false);
      }
    });
  }
}
