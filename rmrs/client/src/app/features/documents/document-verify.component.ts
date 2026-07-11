import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';

/**
 * Result of an integrity verification check.
 */
interface VerifyResult {
  documentId: number;
  isValid: boolean;
  storedChecksum: string;
  computedChecksum: string;
  verifiedAt: string;
}

/**
 * Component for triggering document integrity verification and displaying results.
 * Compares stored SHA-256 checksum with the current file checksum from Bitrix.
 */
@Component({
  selector: 'app-document-verify',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="document-verify" aria-label="Document integrity verification">
      <h3>Integrity Verification</h3>
      <p class="verify-info">Verify that the document stored in Bitrix has not been tampered with by comparing its SHA-256 checksum against the stored value.</p>

      <div class="verify-actions">
        <button
          class="btn btn-primary"
          (click)="verifyIntegrity()"
          [disabled]="verifying()"
          aria-label="Run integrity check on document">
          {{ verifying() ? 'Verifying...' : 'Run Integrity Check' }}
        </button>
      </div>

      @if (verifying()) {
        <div class="verify-progress" role="status" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <span>Computing and comparing checksums...</span>
        </div>
      }

      @if (verifyResult()) {
        <div class="verify-result" [class.result-valid]="verifyResult()!.isValid" [class.result-invalid]="!verifyResult()!.isValid"
          role="alert" [attr.aria-label]="verifyResult()!.isValid ? 'Verification passed' : 'Verification failed'">

          @if (verifyResult()!.isValid) {
            <div class="result-header result-pass">
              <span class="result-icon" aria-hidden="true">&#10003;</span>
              <span class="result-title">Integrity Verified</span>
            </div>
            <p class="result-description">The document's checksum matches the stored value. No tampering detected.</p>
          } @else {
            <div class="result-header result-fail">
              <span class="result-icon" aria-hidden="true">&#10007;</span>
              <span class="result-title">Integrity Mismatch Detected</span>
            </div>
            <p class="result-description">
              WARNING: The document's current checksum does not match the value recorded at upload time.
              This may indicate the file has been modified outside of the RMRS system.
            </p>
          }

          <div class="checksum-details">
            <div class="checksum-row">
              <span class="checksum-label">Stored Checksum:</span>
              <code class="checksum-value">{{ verifyResult()!.storedChecksum }}</code>
            </div>
            <div class="checksum-row">
              <span class="checksum-label">Computed Checksum:</span>
              <code class="checksum-value" [class.mismatch]="!verifyResult()!.isValid">{{ verifyResult()!.computedChecksum }}</code>
            </div>
            <div class="checksum-row">
              <span class="checksum-label">Verified At:</span>
              <span>{{ verifyResult()!.verifiedAt }}</span>
            </div>
          </div>
        </div>
      }

      @if (verifyError()) {
        <div class="verify-error" role="alert">
          <p>{{ verifyError() }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .document-verify { padding: 1.5rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
    h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
    .verify-info { font-size: 0.875rem; color: #666; margin: 0 0 1.5rem; }
    .verify-actions { margin-bottom: 1rem; }
    .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .verify-progress { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; color: #555; }
    .spinner {
      width: 20px; height: 20px; border: 2px solid #e0e0e0; border-top-color: #1976d2;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .verify-result { margin-top: 1rem; border-radius: 8px; padding: 1.25rem; }
    .result-valid { background: #e8f5e9; border: 1px solid #a5d6a7; }
    .result-invalid { background: #ffebee; border: 1px solid #ef9a9a; }
    .result-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .result-icon { font-size: 1.5rem; }
    .result-pass .result-icon { color: #2e7d32; }
    .result-fail .result-icon { color: #c62828; }
    .result-title { font-size: 1.0625rem; font-weight: 600; }
    .result-pass .result-title { color: #2e7d32; }
    .result-fail .result-title { color: #c62828; }
    .result-description { font-size: 0.875rem; color: #333; margin: 0 0 1rem; }
    .checksum-details { background: rgba(0,0,0,0.04); padding: 1rem; border-radius: 4px; }
    .checksum-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
    .checksum-row:last-child { margin-bottom: 0; }
    .checksum-label { font-weight: 500; font-size: 0.8125rem; min-width: 140px; }
    .checksum-value { font-family: monospace; font-size: 0.75rem; word-break: break-all; background: rgba(0,0,0,0.04); padding: 0.25rem 0.5rem; border-radius: 3px; }
    .checksum-value.mismatch { background: #ffcdd2; color: #c62828; }
    .verify-error { margin-top: 1rem; background: #ffebee; padding: 0.75rem; border-radius: 4px; }
    .verify-error p { margin: 0; color: #c62828; font-size: 0.875rem; }
  `]
})
export class DocumentVerifyComponent {
  @Input() documentId!: number;

  private readonly api = inject(ApiService);

  verifying = signal<boolean>(false);
  verifyResult = signal<VerifyResult | null>(null);
  verifyError = signal<string>('');

  verifyIntegrity(): void {
    this.verifying.set(true);
    this.verifyResult.set(null);
    this.verifyError.set('');

    this.api.post<VerifyResult>(`/documents/${this.documentId}/verify`).subscribe({
      next: (result) => {
        this.verifyResult.set(result);
        this.verifying.set(false);
      },
      error: (err) => {
        this.verifying.set(false);
        this.verifyError.set(err.error?.message || 'Verification failed. Unable to reach the document storage service.');
      }
    });
  }
}
