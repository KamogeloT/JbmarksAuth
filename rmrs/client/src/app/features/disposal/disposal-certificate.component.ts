import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@core/api';
import { DisposalCertificate } from '@shared/models';
import { DateFormatPipe } from '@shared/pipes';

/**
 * Component for viewing and downloading disposal certificates.
 * Disposal certificates are retained indefinitely as per NARSSA requirements.
 * Validates: Requirements 7.4
 */
@Component({
  selector: 'app-disposal-certificate',
  standalone: true,
  imports: [CommonModule, DateFormatPipe],
  template: `
    <section class="disposal-certificate" aria-label="Disposal Certificate">
      <header class="page-header">
        <h1>Disposal Certificate</h1>
      </header>

      @if (loading()) {
        <div class="loading" role="status" aria-label="Loading certificate">
          <p>Loading certificate details...</p>
        </div>
      } @else if (certificate()) {
        <div class="certificate-card" role="article" aria-label="Certificate details">
          <dl class="detail-grid">
            <dt>Certificate Number</dt>
            <dd>{{ certificate()!.certificateNumber }}</dd>
            <dt>Disposal Batch ID</dt>
            <dd>{{ certificate()!.disposalBatchId }}</dd>
            <dt>Generated At</dt>
            <dd>{{ certificate()!.generatedAt | dateFormat }}</dd>
          </dl>

          <div class="actions">
            <button
              class="btn-primary"
              (click)="downloadCertificate()"
              aria-label="Download disposal certificate as PDF">
              Download Certificate (PDF)
            </button>
          </div>
        </div>
      } @else {
        <p class="error-message" role="alert">Certificate not found.</p>
      }
    </section>
  `,
  styles: [`
    .disposal-certificate { padding: 1.5rem; max-width: 600px; }
    .page-header h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .loading { padding: 2rem; text-align: center; }
    .certificate-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; }
    .detail-grid { display: grid; grid-template-columns: 10rem 1fr; gap: 0.5rem 1rem; margin-bottom: 1.5rem; }
    .detail-grid dt { font-weight: 500; color: #333; }
    .detail-grid dd { margin: 0; color: #555; }
    .actions { display: flex; gap: 0.75rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .error-message { color: #d32f2f; }
  `]
})
export class DisposalCertificateComponent implements OnInit {
  certificate = signal<DisposalCertificate | null>(null);
  loading = signal(true);

  private batchId: number | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.batchId = +id;
      this.loadCertificate();
    } else {
      this.loading.set(false);
    }
  }

  loadCertificate(): void {
    this.api.get<DisposalCertificate>(`/disposal/batches/${this.batchId}/certificate`).subscribe({
      next: (cert) => {
        this.certificate.set(cert);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  downloadCertificate(): void {
    if (!this.batchId) return;
    this.api.download(`/disposal/batches/${this.batchId}/certificate`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `disposal-certificate-${this.certificate()?.certificateNumber || this.batchId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }
}
