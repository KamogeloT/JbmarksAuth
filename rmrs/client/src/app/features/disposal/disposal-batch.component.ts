import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';
import { DisposalBatch } from '@shared/models';
import { DateFormatPipe } from '@shared/pipes';

/**
 * Disposal batch creation, approval workflow display, and execution.
 * Supports the multi-step disposal workflow: Initiate -> Approve -> Execute.
 * Validates: Requirements 7.3, 7.4
 */
@Component({
  selector: 'app-disposal-batch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateFormatPipe],
  template: `
    <section class="disposal-batch" aria-label="Disposal Batch Management">
      <header class="page-header">
        <h1>{{ batch() ? 'Disposal Batch: ' + batch()!.batchNumber : 'Create Disposal Batch' }}</h1>
      </header>

      @if (!batch()) {
        <!-- Create new batch form -->
        <form [formGroup]="batchForm" (ngSubmit)="createBatch()" class="batch-form" aria-label="Create disposal batch form">
          <div class="form-group">
            <label for="disposalAuthorityRef">Disposal Authority Reference *</label>
            <input
              id="disposalAuthorityRef"
              type="text"
              formControlName="disposalAuthorityRef"
              aria-required="true"
              placeholder="e.g., DA/2024/001" />
            @if (batchForm.get('disposalAuthorityRef')?.invalid && batchForm.get('disposalAuthorityRef')?.touched) {
              <span class="error" role="alert">Disposal authority reference is required.</span>
            }
          </div>

          <div class="form-group">
            <label>Selected Records: {{ selectedRecordIds().length }}</label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="batchForm.invalid || submitting()">
              {{ submitting() ? 'Creating...' : 'Create Batch' }}
            </button>
            <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
          </div>
        </form>
      } @else {
        <!-- Batch detail and workflow -->
        <div class="batch-detail">
          <div class="workflow-status">
            <div class="status-steps" role="list" aria-label="Workflow steps">
              <div class="step" [class.active]="batch()!.status === 'Initiated'" [class.complete]="isStepComplete('Initiated')" role="listitem">
                <span class="step-indicator" aria-hidden="true">1</span>
                <span class="step-label">Initiated</span>
              </div>
              <div class="step-connector" aria-hidden="true"></div>
              <div class="step" [class.active]="batch()!.status === 'Approved'" [class.complete]="isStepComplete('Approved')" role="listitem">
                <span class="step-indicator" aria-hidden="true">2</span>
                <span class="step-label">Approved</span>
              </div>
              <div class="step-connector" aria-hidden="true"></div>
              <div class="step" [class.active]="batch()!.status === 'Executed'" [class.complete]="isStepComplete('Executed')" role="listitem">
                <span class="step-indicator" aria-hidden="true">3</span>
                <span class="step-label">Executed</span>
              </div>
            </div>
          </div>

          <dl class="detail-grid">
            <dt>Batch Number</dt>
            <dd>{{ batch()!.batchNumber }}</dd>
            <dt>Status</dt>
            <dd><span class="badge" [attr.data-status]="batch()!.status">{{ batch()!.status }}</span></dd>
            <dt>Disposal Authority</dt>
            <dd>{{ batch()!.disposalAuthorityRef }}</dd>
            <dt>Initiated</dt>
            <dd>{{ batch()!.initiatedAt | dateFormat }}</dd>
            @if (batch()!.approvedAt) {
              <dt>Approved</dt>
              <dd>{{ batch()!.approvedAt | dateFormat }}</dd>
            }
            @if (batch()!.executedAt) {
              <dt>Executed</dt>
              <dd>{{ batch()!.executedAt | dateFormat }}</dd>
            }
          </dl>

          <div class="batch-actions">
            @if (batch()!.status === 'Initiated') {
              <button class="btn-primary" (click)="approveBatch()" [disabled]="submitting()">
                Approve Batch
              </button>
            }
            @if (batch()!.status === 'Approved') {
              <button class="btn-danger" (click)="executeBatch()" [disabled]="submitting()">
                Execute Disposal
              </button>
            }
            @if (batch()!.certificateGenerated) {
              <button class="btn-secondary" (click)="viewCertificate()">
                View Certificate
              </button>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .disposal-batch { padding: 1.5rem; max-width: 800px; }
    .page-header h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .batch-form .form-group { margin-bottom: 1.25rem; }
    .batch-form label { display: block; font-weight: 500; margin-bottom: 0.25rem; }
    .batch-form input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
    .error { color: #d32f2f; font-size: 0.75rem; }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .btn-danger { background: #d32f2f; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .workflow-status { margin-bottom: 2rem; }
    .status-steps { display: flex; align-items: center; justify-content: center; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .step-indicator { width: 2rem; height: 2rem; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-weight: 600; }
    .step.active .step-indicator { background: #1976d2; color: #fff; }
    .step.complete .step-indicator { background: #4caf50; color: #fff; }
    .step-label { font-size: 0.75rem; color: #555; }
    .step-connector { width: 3rem; height: 2px; background: #e0e0e0; margin: 0 0.5rem; }
    .detail-grid { display: grid; grid-template-columns: 10rem 1fr; gap: 0.5rem 1rem; margin-bottom: 1.5rem; }
    .detail-grid dt { font-weight: 500; color: #333; }
    .detail-grid dd { margin: 0; color: #555; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: #e3f2fd; color: #1565c0; }
    .batch-actions { display: flex; gap: 0.75rem; }
  `]
})
export class DisposalBatchComponent implements OnInit {
  batch = signal<DisposalBatch | null>(null);
  submitting = signal(false);
  selectedRecordIds = signal<number[]>([]);

  batchForm: FormGroup;

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder
  ) {
    this.batchForm = this.fb.group({
      disposalAuthorityRef: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check for batch ID in route params
    const batchId = this.route.snapshot.paramMap.get('id');
    if (batchId) {
      this.loadBatch(+batchId);
    }

    // Check for selected records from navigation state
    const state = this.router.getCurrentNavigation()?.extras?.state;
    if (state && state['selectedRecordIds']) {
      this.selectedRecordIds.set(state['selectedRecordIds']);
    }
  }

  loadBatch(id: number): void {
    this.api.get<DisposalBatch>(`/disposal/batches/${id}`).subscribe({
      next: (batch) => this.batch.set(batch)
    });
  }

  createBatch(): void {
    if (this.batchForm.invalid) return;
    this.submitting.set(true);

    const payload = {
      disposalAuthorityRef: this.batchForm.value.disposalAuthorityRef,
      recordIds: this.selectedRecordIds()
    };

    this.api.post<DisposalBatch>('/disposal/batches', payload).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  approveBatch(): void {
    if (!this.batch()) return;
    this.submitting.set(true);
    this.api.post<DisposalBatch>(`/disposal/batches/${this.batch()!.id}/approve`).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  executeBatch(): void {
    if (!this.batch()) return;
    this.submitting.set(true);
    this.api.post<DisposalBatch>(`/disposal/batches/${this.batch()!.id}/execute`).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  viewCertificate(): void {
    if (!this.batch()) return;
    this.router.navigate(['/disposal/certificate', this.batch()!.id]);
  }

  isStepComplete(step: string): boolean {
    const order = ['Initiated', 'Approved', 'Executed'];
    const currentIdx = order.indexOf(this.batch()?.status || '');
    const stepIdx = order.indexOf(step);
    return stepIdx < currentIdx;
  }

  cancel(): void {
    this.router.navigate(['/disposal/candidates']);
  }
}
