import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { Loan } from '../../shared/models';
import { DateFormatPipe } from '../../shared/pipes';

/**
 * Component for creating and returning loans of physical records.
 * Captures borrower, loan date, and expected return date for new loans.
 * Provides a return interface for active loans.
 */
@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateFormatPipe],
  template: `
    <div class="loan-form" aria-label="Physical record loan management">
      @switch (mode()) {
        @case ('create') {
          <h3>Create Loan</h3>
          <p class="form-info">Loan this physical record to a user. Record the borrower and expected return date.</p>

          <form [formGroup]="createForm" (ngSubmit)="createLoan()">
            <div class="form-row">
              <div class="form-group">
                <label for="borrowerUserId">Borrower User ID *</label>
                <input id="borrowerUserId" type="number" formControlName="borrowerUserId"
                  placeholder="User ID" aria-required="true"
                  [attr.aria-invalid]="isCreateFieldInvalid('borrowerUserId')" />
                @if (isCreateFieldInvalid('borrowerUserId')) {
                  <span class="error-text" role="alert">Borrower is required.</span>
                }
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="loanDate">Loan Date *</label>
                <input id="loanDate" type="date" formControlName="loanDate" aria-required="true"
                  [attr.aria-invalid]="isCreateFieldInvalid('loanDate')" />
                @if (isCreateFieldInvalid('loanDate')) {
                  <span class="error-text" role="alert">Loan date is required.</span>
                }
              </div>
              <div class="form-group">
                <label for="expectedReturnDate">Expected Return Date *</label>
                <input id="expectedReturnDate" type="date" formControlName="expectedReturnDate" aria-required="true"
                  [attr.aria-invalid]="isCreateFieldInvalid('expectedReturnDate')" />
                @if (isCreateFieldInvalid('expectedReturnDate')) {
                  <span class="error-text" role="alert">Expected return date is required.</span>
                }
              </div>
            </div>

            @if (createError()) {
              <div class="form-error" role="alert">{{ createError() }}</div>
            }

            @if (createSuccess()) {
              <div class="form-success" role="status">Loan created successfully!</div>
            }

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                {{ submitting() ? 'Creating...' : 'Create Loan' }}
              </button>
            </div>
          </form>
        }

        @case ('return') {
          <h3>Return Record</h3>
          <p class="form-info">Record the return of this physical record from loan.</p>

          @if (activeLoan()) {
            <div class="loan-info">
              <div class="info-row">
                <span class="info-label">Borrower User ID:</span>
                <span class="info-value">{{ activeLoan()!.borrowerUserId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Loan Date:</span>
                <span class="info-value">{{ activeLoan()!.loanDate | dateFormat }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Expected Return:</span>
                <span class="info-value" [class.overdue]="isOverdue()">
                  {{ activeLoan()!.expectedReturnDate | dateFormat }}
                  @if (isOverdue()) {
                    <span class="overdue-badge">OVERDUE</span>
                  }
                </span>
              </div>
            </div>

            <form [formGroup]="returnForm" (ngSubmit)="returnRecord()">
              <div class="form-row">
                <div class="form-group">
                  <label for="actualReturnDate">Actual Return Date *</label>
                  <input id="actualReturnDate" type="date" formControlName="actualReturnDate" aria-required="true"
                    [attr.aria-invalid]="isReturnFieldInvalid('actualReturnDate')" />
                  @if (isReturnFieldInvalid('actualReturnDate')) {
                    <span class="error-text" role="alert">Return date is required.</span>
                  }
                </div>
              </div>

              @if (returnError()) {
                <div class="form-error" role="alert">{{ returnError() }}</div>
              }

              @if (returnSuccess()) {
                <div class="form-success" role="status">Record returned successfully!</div>
              }

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                  {{ submitting() ? 'Processing...' : 'Confirm Return' }}
                </button>
              </div>
            </form>
          } @else {
            <p class="no-loan">No active loan found for this record.</p>
          }
        }
      }
    </div>
  `,
  styles: [`
    .loan-form { padding: 1.5rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
    h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
    .form-info { font-size: 0.875rem; color: #666; margin: 0 0 1.5rem; }
    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 180px; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.375rem; font-size: 0.875rem; }
    .form-group input {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem; font-family: inherit;
    }
    .form-group input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.15); }
    .form-group input[aria-invalid="true"] { border-color: #d32f2f; }
    .error-text { color: #d32f2f; font-size: 0.75rem; margin-top: 0.25rem; display: block; }
    .form-error { background: #ffebee; color: #c62828; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .form-success { background: #e8f5e9; color: #2e7d32; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }
    .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .loan-info { background: #f9f9f9; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; }
    .info-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-weight: 500; font-size: 0.875rem; min-width: 140px; }
    .info-value { font-size: 0.875rem; }
    .info-value.overdue { color: #d32f2f; }
    .overdue-badge { font-size: 0.6875rem; background: #ffcdd2; color: #c62828; padding: 0.125rem 0.375rem; border-radius: 3px; margin-left: 0.5rem; }
    .no-loan { color: #666; font-size: 0.875rem; }
  `]
})
export class LoanFormComponent {
  @Input() physicalRecordId!: number;
  @Input() activeLoan = signal<Loan | null>(null);
  @Input() mode = signal<'create' | 'return'>('create');

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  submitting = signal<boolean>(false);
  createError = signal<string>('');
  createSuccess = signal<boolean>(false);
  returnError = signal<string>('');
  returnSuccess = signal<boolean>(false);

  createForm: FormGroup = this.fb.group({
    borrowerUserId: [null, [Validators.required]],
    loanDate: ['', [Validators.required]],
    expectedReturnDate: ['', [Validators.required]]
  });

  returnForm: FormGroup = this.fb.group({
    actualReturnDate: ['', [Validators.required]]
  });

  isOverdue(): boolean {
    const loan = this.activeLoan();
    if (!loan) return false;
    return new Date(loan.expectedReturnDate) < new Date() && !loan.actualReturnDate;
  }

  isCreateFieldInvalid(fieldName: string): boolean {
    const control = this.createForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isReturnFieldInvalid(fieldName: string): boolean {
    const control = this.returnForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  createLoan(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.createError.set('');
    this.createSuccess.set(false);

    const payload = {
      borrowerUserId: Number(this.createForm.value.borrowerUserId),
      loanDate: this.createForm.value.loanDate,
      expectedReturnDate: this.createForm.value.expectedReturnDate
    };

    this.api.post<Loan>(`/physical-records/${this.physicalRecordId}/loan`, payload).subscribe({
      next: (loan) => {
        this.submitting.set(false);
        this.createSuccess.set(true);
        this.activeLoan.set(loan);
        this.createForm.reset();
      },
      error: (err) => {
        this.submitting.set(false);
        this.createError.set(err.error?.message || 'Failed to create loan. Please try again.');
      }
    });
  }

  returnRecord(): void {
    if (this.returnForm.invalid) {
      this.returnForm.markAllAsTouched();
      return;
    }

    const loan = this.activeLoan();
    if (!loan) return;

    this.submitting.set(true);
    this.returnError.set('');
    this.returnSuccess.set(false);

    const payload = {
      actualReturnDate: this.returnForm.value.actualReturnDate
    };

    this.api.post(`/physical-records/${this.physicalRecordId}/return`, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.returnSuccess.set(true);
        this.activeLoan.set(null);
        this.returnForm.reset();
      },
      error: (err) => {
        this.submitting.set(false);
        this.returnError.set(err.error?.message || 'Failed to process return. Please try again.');
      }
    });
  }
}
