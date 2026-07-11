import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { Record } from '../../shared/models';

/**
 * Component for registering incoming records.
 * Captures all required metadata fields plus external reference fields
 * (external reference number, originating organization, correspondence date).
 */
@Component({
  selector: 'app-register-incoming',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="register-form" aria-label="Register incoming record form">
      <h2>Register Incoming Record</h2>
      <p class="form-subtitle">Register a new incoming correspondence with required metadata and external reference details.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <fieldset>
          <legend>Record Metadata</legend>

          <div class="form-row">
            <div class="form-group">
              <label for="subject">Subject *</label>
              <input id="subject" type="text" formControlName="subject" placeholder="Record subject" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('subject')" />
              @if (isFieldInvalid('subject')) {
                <span class="error-text" role="alert">Subject is required.</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="senderOrRecipient">Sender *</label>
              <input id="senderOrRecipient" type="text" formControlName="senderOrRecipient" placeholder="Sender name or organization" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('senderOrRecipient')" />
              @if (isFieldInvalid('senderOrRecipient')) {
                <span class="error-text" role="alert">Sender is required.</span>
              }
            </div>
            <div class="form-group">
              <label for="dateReceivedOrSent">Date Received *</label>
              <input id="dateReceivedOrSent" type="date" formControlName="dateReceivedOrSent" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('dateReceivedOrSent')" />
              @if (isFieldInvalid('dateReceivedOrSent')) {
                <span class="error-text" role="alert">Date received is required.</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="filePlanClassificationCode">File Plan Classification Code *</label>
              <input id="filePlanClassificationCode" type="text" formControlName="filePlanClassificationCode"
                placeholder="e.g., 1.2.3" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('filePlanClassificationCode')" />
              @if (isFieldInvalid('filePlanClassificationCode')) {
                <span class="error-text" role="alert">Classification code is required.</span>
              }
            </div>
            <div class="form-group">
              <label for="responsibleOfficerId">Responsible Officer ID *</label>
              <input id="responsibleOfficerId" type="number" formControlName="responsibleOfficerId" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('responsibleOfficerId')" />
              @if (isFieldInvalid('responsibleOfficerId')) {
                <span class="error-text" role="alert">Responsible officer is required.</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="classificationLevelOverride">Classification Level Override</label>
              <select id="classificationLevelOverride" formControlName="classificationLevelOverride">
                <option [value]="null">Use default from file plan</option>
                <option [value]="0">Public</option>
                <option [value]="1">Internal</option>
                <option [value]="2">Confidential</option>
                <option [value]="3">Restricted</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>External Reference Details</legend>

          <div class="form-row">
            <div class="form-group">
              <label for="externalReferenceNumber">External Reference Number *</label>
              <input id="externalReferenceNumber" type="text" formControlName="externalReferenceNumber"
                placeholder="External reference" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('externalReferenceNumber')" />
              @if (isFieldInvalid('externalReferenceNumber')) {
                <span class="error-text" role="alert">External reference number is required for incoming records.</span>
              }
            </div>
            <div class="form-group">
              <label for="correspondenceDate">Correspondence Date *</label>
              <input id="correspondenceDate" type="date" formControlName="correspondenceDate" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('correspondenceDate')" />
              @if (isFieldInvalid('correspondenceDate')) {
                <span class="error-text" role="alert">Correspondence date is required.</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="originatingOrganization">Originating Organization *</label>
              <input id="originatingOrganization" type="text" formControlName="originatingOrganization"
                placeholder="Organization name" aria-required="true"
                [attr.aria-invalid]="isFieldInvalid('originatingOrganization')" />
              @if (isFieldInvalid('originatingOrganization')) {
                <span class="error-text" role="alert">Originating organization is required.</span>
              }
            </div>
          </div>
        </fieldset>

        @if (serverError()) {
          <div class="server-error" role="alert">{{ serverError() }}</div>
        }

        @if (successMessage()) {
          <div class="success-message" role="status">{{ successMessage() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn btn-cancel" (click)="resetForm()">Reset</button>
          <button type="submit" class="btn btn-primary" [disabled]="submitting()">
            {{ submitting() ? 'Registering...' : 'Register Record' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .register-form { padding: 1.5rem; max-width: 800px; }
    h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    .form-subtitle { color: #666; margin: 0 0 1.5rem; font-size: 0.875rem; }
    fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
    legend { font-weight: 600; font-size: 0.9375rem; padding: 0 0.5rem; }
    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 200px; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.375rem; font-size: 0.875rem; }
    .form-group input, .form-group select {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem; font-family: inherit;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.15); }
    .form-group input[aria-invalid="true"] { border-color: #d32f2f; }
    .error-text { color: #d32f2f; font-size: 0.75rem; margin-top: 0.25rem; display: block; }
    .server-error { background: #ffebee; color: #c62828; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .success-message { background: #e8f5e9; color: #2e7d32; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-cancel { background: #f5f5f5; border: 1px solid #ccc; color: #333; }
  `]
})
export class RegisterIncomingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  submitting = signal<boolean>(false);
  serverError = signal<string>('');
  successMessage = signal<string>('');

  form: FormGroup = this.fb.group({
    subject: ['', [Validators.required, Validators.maxLength(500)]],
    senderOrRecipient: ['', [Validators.required, Validators.maxLength(256)]],
    dateReceivedOrSent: ['', [Validators.required]],
    filePlanClassificationCode: ['', [Validators.required]],
    responsibleOfficerId: [null, [Validators.required]],
    classificationLevelOverride: [null],
    externalReferenceNumber: ['', [Validators.required, Validators.maxLength(100)]],
    originatingOrganization: ['', [Validators.required, Validators.maxLength(256)]],
    correspondenceDate: ['', [Validators.required]]
  });

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set('');
    this.successMessage.set('');

    const payload = { ...this.form.value };
    if (payload.classificationLevelOverride !== null) {
      payload.classificationLevelOverride = Number(payload.classificationLevelOverride);
    }
    if (payload.responsibleOfficerId) {
      payload.responsibleOfficerId = Number(payload.responsibleOfficerId);
    }

    this.api.post<Record>('/records/incoming', payload).subscribe({
      next: (record) => {
        this.submitting.set(false);
        this.successMessage.set(`Record registered successfully. Registry Number: ${record.registryNumber}`);
        this.form.reset();
      },
      error: (err) => {
        this.submitting.set(false);
        this.serverError.set(err.error?.message || 'Failed to register record. Please try again.');
      }
    });
  }

  resetForm(): void {
    this.form.reset();
    this.serverError.set('');
    this.successMessage.set('');
  }
}
