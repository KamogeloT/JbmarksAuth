import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { PhysicalRecord, StorageLocation } from '../../shared/models';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';
import { DateFormatPipe } from '../../shared/pipes';

/**
 * Scan result containing physical record details.
 */
interface ScanResult {
  physicalRecord: PhysicalRecord;
  currentLocation: StorageLocation | null;
  registryNumber: string;
  subject: string;
}

/**
 * Component for barcode/QR scanning interface.
 * Allows clerks to scan barcodes and view record information,
 * supports bulk scanning for batch location assignment.
 */
@Component({
  selector: 'app-physical-record-scan',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HelpBannerComponent, DateFormatPipe],
  template: `
    <div class="scan-interface" aria-label="Physical record scanning interface">
      <h2>Scan Physical Records</h2>

      <app-help-banner
        title="Physical File Tracking"
        [tips]="['Track physical files using barcodes and QR codes.', 'Scan a barcode to quickly find or move a file.', 'Use the loan feature to track who has borrowed a file.', 'Set up storage locations (building → room → cabinet → shelf).', 'Overdue loans are flagged automatically.']">
      </app-help-banner>

      <p class="scan-info">Scan barcode or QR code to look up physical record details. Supports bulk scanning for batch operations.</p>

      <div class="scan-input-section">
        <form [formGroup]="scanForm" (ngSubmit)="scanBarcode()">
          <div class="scan-row">
            <div class="form-group scan-input-group">
              <label for="barcodeInput">Barcode / QR Code Value</label>
              <input
                id="barcodeInput"
                type="text"
                formControlName="barcode"
                placeholder="Scan or enter barcode value..."
                aria-label="Enter barcode or QR code value"
                autofocus />
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="scanning()" aria-label="Look up barcode" title="Search for the physical record associated with this barcode">
              {{ scanning() ? 'Scanning...' : 'Look Up' }}
            </button>
          </div>
        </form>
      </div>

      @if (scanError()) {
        <div class="scan-error" role="alert">{{ scanError() }}</div>
      }

      <!-- Single Scan Result -->
      @if (lastResult()) {
        <div class="scan-result" aria-label="Scan result">
          <h3>Scan Result</h3>
          <div class="result-card">
            <div class="result-grid">
              <div class="result-item">
                <span class="result-label">Registry Number</span>
                <span class="result-value">{{ lastResult()!.registryNumber }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Subject</span>
                <span class="result-value">{{ lastResult()!.subject }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Barcode</span>
                <span class="result-value mono">{{ lastResult()!.physicalRecord.barcodeValue }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Status</span>
                <span class="result-value status-badge" [class]="'status-' + lastResult()!.physicalRecord.status.toLowerCase()">
                  {{ lastResult()!.physicalRecord.status }}
                </span>
              </div>
              <div class="result-item">
                <span class="result-label">Current Location</span>
                <span class="result-value">
                  {{ lastResult()!.currentLocation ? lastResult()!.currentLocation!.locationName + ' (' + lastResult()!.currentLocation!.locationCode + ')' : 'Unknown' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Bulk Scan Section -->
      <div class="bulk-scan-section" aria-label="Bulk scanning">
        <h3>Bulk Scan Mode</h3>
        <p class="bulk-info">Scan multiple barcodes to queue records for batch location assignment.</p>

        <div class="bulk-controls">
          <button class="btn" [class.btn-active]="bulkMode()" (click)="toggleBulkMode()" aria-label="Toggle bulk scan mode">
            {{ bulkMode() ? 'Exit Bulk Mode' : 'Enter Bulk Mode' }}
          </button>
          @if (bulkMode() && scannedRecords().length > 0) {
            <button class="btn btn-secondary" (click)="clearBulkScans()" aria-label="Clear all scanned records">
              Clear All ({{ scannedRecords().length }})
            </button>
          }
        </div>

        @if (bulkMode() && scannedRecords().length > 0) {
          <div class="bulk-list" role="list" aria-label="Scanned records queue">
            @for (item of scannedRecords(); track item.physicalRecord.id) {
              <div class="bulk-item" role="listitem">
                <span class="bulk-barcode">{{ item.physicalRecord.barcodeValue }}</span>
                <span class="bulk-registry">{{ item.registryNumber }}</span>
                <span class="bulk-subject">{{ item.subject }}</span>
                <button class="remove-btn" (click)="removeBulkItem(item)" [attr.aria-label]="'Remove ' +  item.registryNumber  + ' from bulk list'">
                  &times;
                </button>
              </div>
            }
          </div>
          <p class="bulk-count">{{ scannedRecords().length }} record(s) scanned</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .scan-interface { padding: 1.5rem; }
    h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    h3 { margin: 0 0 0.5rem; font-size: 1rem; }
    .scan-info, .bulk-info { font-size: 0.875rem; color: #666; margin: 0 0 1.5rem; }
    .scan-input-section { margin-bottom: 1.5rem; }
    .scan-row { display: flex; gap: 0.75rem; align-items: flex-end; }
    .scan-input-group { flex: 1; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.375rem; font-size: 0.875rem; }
    .form-group input {
      width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #ccc; border-radius: 4px;
      font-size: 1rem; font-family: monospace;
    }
    .form-group input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.15); }
    .btn { padding: 0.625rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; background: #f5f5f5; border: 1px solid #ccc; color: #333; }
    .btn-primary { background: #1976d2; color: #fff; border: none; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #f5f5f5; }
    .btn-active { background: #e3f2fd; border-color: #1976d2; color: #1976d2; }
    .scan-error { background: #ffebee; color: #c62828; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .scan-result { margin-bottom: 2rem; }
    .result-card { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; }
    .result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .result-item { display: flex; flex-direction: column; }
    .result-label { font-size: 0.75rem; color: #666; text-transform: uppercase; margin-bottom: 0.25rem; }
    .result-value { font-size: 0.9375rem; }
    .result-value.mono { font-family: monospace; }
    .status-badge { font-weight: 600; font-size: 0.8125rem; }
    .status-instorage { color: #2e7d32; }
    .status-onloan { color: #f57c00; }
    .status-intransit { color: #1565c0; }
    .bulk-scan-section { border-top: 1px solid #e0e0e0; padding-top: 1.5rem; }
    .bulk-controls { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
    .bulk-list { border: 1px solid #e0e0e0; border-radius: 4px; max-height: 300px; overflow-y: auto; }
    .bulk-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
    .bulk-item:last-child { border-bottom: none; }
    .bulk-barcode { font-family: monospace; font-size: 0.8125rem; flex: 0 0 140px; }
    .bulk-registry { font-weight: 500; font-size: 0.8125rem; flex: 0 0 180px; }
    .bulk-subject { flex: 1; font-size: 0.8125rem; color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .remove-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #d32f2f; padding: 0; }
    .bulk-count { font-size: 0.8125rem; color: #666; margin-top: 0.5rem; }
  `]
})
export class PhysicalRecordScanComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  scanning = signal<boolean>(false);
  scanError = signal<string>('');
  lastResult = signal<ScanResult | null>(null);
  bulkMode = signal<boolean>(false);
  scannedRecords = signal<ScanResult[]>([]);

  scanForm: FormGroup = this.fb.group({
    barcode: ['', [Validators.required]]
  });

  scanBarcode(): void {
    if (this.scanForm.invalid) return;

    const barcode = this.scanForm.value.barcode.trim();
    if (!barcode) return;

    this.scanning.set(true);
    this.scanError.set('');

    this.api.get<ScanResult>(`/physical-records/scan/${encodeURIComponent(barcode)}`).subscribe({
      next: (result) => {
        this.scanning.set(false);
        this.lastResult.set(result);

        if (this.bulkMode()) {
          // Add to bulk list if not already there
          const existing = this.scannedRecords().find(r => r.physicalRecord.id === result.physicalRecord.id);
          if (!existing) {
            this.scannedRecords.update(records => [...records, result]);
          }
        }

        // Clear input for next scan
        this.scanForm.reset();
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanError.set(err.error?.message || `No record found for barcode "${barcode}".`);
      }
    });
  }

  toggleBulkMode(): void {
    this.bulkMode.update(v => !v);
    if (!this.bulkMode()) {
      this.scannedRecords.set([]);
    }
  }

  clearBulkScans(): void {
    this.scannedRecords.set([]);
  }

  removeBulkItem(item: ScanResult): void {
    this.scannedRecords.update(records => records.filter(r => r.physicalRecord.id !== item.physicalRecord.id));
  }
}
