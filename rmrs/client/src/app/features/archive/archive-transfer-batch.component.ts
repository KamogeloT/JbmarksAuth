import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';
import { DateFormatPipe } from '@shared/pipes';

/**
 * Transfer batch status values.
 */
export type TransferBatchStatus = 'Draft' | 'Validated' | 'Finalized' | 'Completed';

/**
 * Represents a transfer batch for archive transfer.
 */
export interface TransferBatch {
  id: number;
  batchNumber: string;
  destinationArchive: string;
  status: TransferBatchStatus;
  createdByUserId: number;
  finalizedAt: string | null;
  completedAt: string | null;
  archiveReferenceNumber: string | null;
  createdAt: string;
  records: TransferBatchRecord[];
}

export interface TransferBatchRecord {
  recordId: number;
  registryNumber: string;
  subject: string;
  validationStatus: 'Pending' | 'Valid' | 'Invalid';
  validationErrors: string | null;
}

/**
 * Archive transfer batch management component.
 * Supports batch creation, record selection, validation, and finalization.
 * Validates: Requirements 8.1, 8.2, 8.4, 8.5
 */
@Component({
  selector: 'app-archive-transfer-batch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HelpBannerComponent, DateFormatPipe],
  template: `
    <section class="archive-transfer" aria-label="Archive Transfer Batch">
      <header class="page-header">
        <h1>{{ batch() ? 'Transfer Batch: ' + batch()!.batchNumber : 'Create Transfer Batch' }}</h1>
      </header>

      <app-help-banner
        title="Archive Transfer"
        [tips]="['Transfer permanent records to archive custody.', 'Create a batch, add records, then validate metadata completeness.', 'The system checks that all required metadata is present.', 'Generate a transfer manifest for the receiving archive.', 'Track retrieval requests from archived records.']">
      </app-help-banner>

      @if (!batch()) {
        <!-- Create new transfer batch -->
        <form [formGroup]="batchForm" (ngSubmit)="createBatch()" class="batch-form" aria-label="Create transfer batch form">
          <div class="form-group">
            <label for="destinationArchive">Destination Archive *</label>
            <input
              id="destinationArchive"
              type="text"
              formControlName="destinationArchive"
              aria-required="true"
              placeholder="e.g., National Archives Repository - Pretoria" />
            @if (batchForm.get('destinationArchive')?.invalid && batchForm.get('destinationArchive')?.touched) {
              <span class="error" role="alert">Destination archive is required.</span>
            }
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="batchForm.invalid || submitting()">
              {{ submitting() ? 'Creating...' : 'Create Batch' }}
            </button>
          </div>
        </form>
      } @else {
        <!-- Batch detail view -->
        <div class="batch-detail">
          <div class="workflow-status">
            <div class="status-steps" role="list" aria-label="Transfer workflow steps">
              <div class="step" [class.active]="batch()!.status === 'Draft'" [class.complete]="isStepComplete('Draft')" role="listitem">
                <span class="step-indicator" aria-hidden="true">1</span>
                <span class="step-label">Draft</span>
              </div>
              <div class="step-connector" aria-hidden="true"></div>
              <div class="step" [class.active]="batch()!.status === 'Validated'" [class.complete]="isStepComplete('Validated')" role="listitem">
                <span class="step-indicator" aria-hidden="true">2</span>
                <span class="step-label">Validated</span>
              </div>
              <div class="step-connector" aria-hidden="true"></div>
              <div class="step" [class.active]="batch()!.status === 'Finalized'" [class.complete]="isStepComplete('Finalized')" role="listitem">
                <span class="step-indicator" aria-hidden="true">3</span>
                <span class="step-label">Finalized</span>
              </div>
              <div class="step-connector" aria-hidden="true"></div>
              <div class="step" [class.active]="batch()!.status === 'Completed'" role="listitem">
                <span class="step-indicator" aria-hidden="true">4</span>
                <span class="step-label">Completed</span>
              </div>
            </div>
          </div>

          <dl class="detail-grid">
            <dt>Batch Number</dt>
            <dd>{{ batch()!.batchNumber }}</dd>
            <dt>Destination</dt>
            <dd>{{ batch()!.destinationArchive }}</dd>
            <dt>Status</dt>
            <dd><span class="badge">{{ batch()!.status }}</span></dd>
            <dt>Created</dt>
            <dd>{{ batch()!.createdAt | dateFormat }}</dd>
            @if (batch()!.finalizedAt) {
              <dt>Finalized</dt>
              <dd>{{ batch()!.finalizedAt | dateFormat }}</dd>
            }
            @if (batch()!.archiveReferenceNumber) {
              <dt>Archive Reference</dt>
              <dd>{{ batch()!.archiveReferenceNumber }}</dd>
            }
          </dl>

          <!-- Records in batch -->
          @if (batch()!.records && batch()!.records.length > 0) {
            <h2>Records in Batch</h2>
            <table class="records-table" role="grid" aria-label="Transfer batch records">
              <thead>
                <tr>
                  <th scope="col">Registry Number</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Validation</th>
                  <th scope="col">Errors</th>
                </tr>
              </thead>
              <tbody>
                @for (record of batch()!.records; track record.recordId) {
                  <tr>
                    <td>{{ record.registryNumber }}</td>
                    <td>{{ record.subject }}</td>
                    <td>
                      <span class="validation-badge" [attr.data-status]="record.validationStatus">
                        {{ record.validationStatus }}
                      </span>
                    </td>
                    <td>{{ record.validationErrors || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- Record selection for Draft batches -->
          @if (batch()!.status === 'Draft') {
            <div class="add-records-section">
              <h2>Add Records</h2>
              <form [formGroup]="addRecordsForm" (ngSubmit)="addRecords()" aria-label="Add records to batch">
                <div class="form-group">
                  <label for="recordIds">Record IDs (comma-separated)</label>
                  <input
                    id="recordIds"
                    type="text"
                    formControlName="recordIds"
                    placeholder="e.g., 101, 102, 103" />
                </div>
                <button type="submit" class="btn-secondary" [disabled]="submitting()">Add Records</button>
              </form>
            </div>
          }

          <div class="batch-actions">
            @if (batch()!.status === 'Draft') {
              <button class="btn-primary" (click)="validateBatch()" [disabled]="submitting()" title="Check that all records have complete metadata">Validate Batch</button>
            }
            @if (batch()!.status === 'Validated') {
              <button class="btn-primary" (click)="finalizeBatch()" [disabled]="submitting()" title="Lock the batch — no more changes allowed after this">Finalize Batch</button>
            }
            @if (batch()!.status === 'Finalized') {
              <button class="btn-primary" (click)="completeBatch()" [disabled]="submitting()" title="Confirm receipt by the archive">Mark Completed</button>
              <button class="btn-secondary" (click)="downloadManifest()" title="Download a PDF manifest for handover to the receiving archive">Download Manifest</button>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .archive-transfer { padding: 1.5rem; max-width: 900px; }
    .page-header h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .batch-form .form-group { margin-bottom: 1.25rem; }
    .batch-form label { display: block; font-weight: 500; margin-bottom: 0.25rem; }
    .batch-form input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .error { color: #d32f2f; font-size: 0.75rem; }
    .form-actions { margin-top: 1.5rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .workflow-status { margin-bottom: 2rem; }
    .status-steps { display: flex; align-items: center; justify-content: center; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .step-indicator { width: 2rem; height: 2rem; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; }
    .step.active .step-indicator { background: #1976d2; color: #fff; }
    .step.complete .step-indicator { background: #4caf50; color: #fff; }
    .step-label { font-size: 0.75rem; color: #555; }
    .step-connector { width: 2rem; height: 2px; background: #e0e0e0; margin: 0 0.25rem; }
    .detail-grid { display: grid; grid-template-columns: 10rem 1fr; gap: 0.5rem 1rem; margin-bottom: 1.5rem; }
    .detail-grid dt { font-weight: 500; }
    .detail-grid dd { margin: 0; color: #555; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: #e8f5e9; color: #2e7d32; }
    .records-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    .records-table th, .records-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e0e0e0; text-align: left; }
    .records-table th { background: #f5f5f5; }
    .validation-badge { padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; }
    .validation-badge[data-status="Valid"] { background: #e8f5e9; color: #2e7d32; }
    .validation-badge[data-status="Invalid"] { background: #ffebee; color: #c62828; }
    .validation-badge[data-status="Pending"] { background: #fff3e0; color: #e65100; }
    .add-records-section { margin: 1.5rem 0; padding: 1rem; border: 1px dashed #ccc; border-radius: 4px; }
    .add-records-section h2 { margin: 0 0 1rem; font-size: 1rem; }
    .add-records-section .form-group { margin-bottom: 0.75rem; }
    .add-records-section label { display: block; font-size: 0.875rem; margin-bottom: 0.25rem; }
    .add-records-section input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .batch-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    h2 { font-size: 1.125rem; margin: 1.5rem 0 0.75rem; }
  `]
})
export class ArchiveTransferBatchComponent implements OnInit {
  batch = signal<TransferBatch | null>(null);
  submitting = signal(false);

  batchForm: FormGroup;
  addRecordsForm: FormGroup;

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder
  ) {
    this.batchForm = this.fb.group({
      destinationArchive: ['', Validators.required]
    });
    this.addRecordsForm = this.fb.group({
      recordIds: ['']
    });
  }

  ngOnInit(): void {
    const batchId = this.route.snapshot.paramMap.get('id');
    if (batchId) {
      this.loadBatch(+batchId);
    }
  }

  loadBatch(id: number): void {
    this.api.get<TransferBatch>(`/archive/batches/${id}`).subscribe({
      next: (batch) => this.batch.set(batch)
    });
  }

  createBatch(): void {
    if (this.batchForm.invalid) return;
    this.submitting.set(true);

    this.api.post<TransferBatch>('/archive/batches', {
      destinationArchive: this.batchForm.value.destinationArchive
    }).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  addRecords(): void {
    if (!this.batch()) return;
    const idsStr = this.addRecordsForm.value.recordIds;
    const recordIds = idsStr.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
    if (recordIds.length === 0) return;

    this.submitting.set(true);
    this.api.post<TransferBatch>(`/archive/batches/${this.batch()!.id}/records`, { recordIds }).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.addRecordsForm.reset();
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  validateBatch(): void {
    if (!this.batch()) return;
    this.submitting.set(true);
    this.api.post<TransferBatch>(`/archive/batches/${this.batch()!.id}/validate`).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  finalizeBatch(): void {
    if (!this.batch()) return;
    this.submitting.set(true);
    this.api.post<TransferBatch>(`/archive/batches/${this.batch()!.id}/finalize`).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  completeBatch(): void {
    if (!this.batch()) return;
    this.submitting.set(true);
    this.api.post<TransferBatch>(`/archive/batches/${this.batch()!.id}/complete`).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  downloadManifest(): void {
    if (!this.batch()) return;
    this.api.download(`/archive/batches/${this.batch()!.id}/manifest`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transfer-manifest-${this.batch()!.batchNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  isStepComplete(step: string): boolean {
    const order = ['Draft', 'Validated', 'Finalized', 'Completed'];
    const currentIdx = order.indexOf(this.batch()?.status || '');
    const stepIdx = order.indexOf(step);
    return stepIdx < currentIdx;
  }
}
