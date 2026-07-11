import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/api';

/**
 * A lookup value entry.
 */
export interface LookupValue {
  id: number;
  lookupType: string;
  code: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Lookup table editor for managing all lookup value types:
 * record types, classification levels, storage locations, departments, disposal authority references.
 * Validates: Requirements 13.2
 */
@Component({
  selector: 'app-lookup-table-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="lookup-editor" aria-label="Lookup Table Management">
      <header class="page-header">
        <h1>Lookup Tables</h1>
        <p class="subtitle">Manage system lookup values for record types, classifications, and more.</p>
      </header>

      <!-- Type selector -->
      <div class="type-selector">
        <label for="lookupType">Select Lookup Type</label>
        <select id="lookupType" (change)="onTypeChange($event)" aria-label="Select lookup type">
          <option value="">-- Select Type --</option>
          @for (type of lookupTypes; track type) {
            <option [value]="type">{{ type }}</option>
          }
        </select>
      </div>

      @if (selectedType()) {
        <!-- Add new value -->
        <details class="add-section">
          <summary>Add New Value</summary>
          <form [formGroup]="addForm" (ngSubmit)="addValue()" class="add-form" aria-label="Add lookup value">
            <div class="form-row">
              <div class="form-group">
                <label for="newCode">Code *</label>
                <input id="newCode" type="text" formControlName="code" aria-required="true" />
              </div>
              <div class="form-group">
                <label for="newDisplay">Display Name *</label>
                <input id="newDisplay" type="text" formControlName="displayName" aria-required="true" />
              </div>
              <div class="form-group">
                <label for="newSort">Sort Order</label>
                <input id="newSort" type="number" formControlName="sortOrder" />
              </div>
              <button type="submit" class="btn-primary" [disabled]="addForm.invalid">Add</button>
            </div>
          </form>
        </details>

        <!-- Values table -->
        @if (loading()) {
          <div class="loading" role="status"><p>Loading...</p></div>
        } @else {
          <table class="lookup-table" role="grid" aria-label="Lookup values">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Display Name</th>
                <th scope="col">Sort Order</th>
                <th scope="col">Active</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (value of values(); track value.id) {
                <tr [class.inactive]="!value.isActive">
                  <td><code>{{ value.code }}</code></td>
                  <td>{{ value.displayName }}</td>
                  <td>{{ value.sortOrder }}</td>
                  <td>
                    <span [class.active-badge]="value.isActive" [class.inactive-badge]="!value.isActive">
                      {{ value.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-toggle" (click)="toggleActive(value)"
                      [attr.aria-label]="(value.isActive ? 'Deactivate' : 'Activate') + ' ' + value.displayName">
                      {{ value.isActive ? 'Deactivate' : 'Activate' }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty-state">No values defined for this type.</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
  styles: [`
    .lookup-editor { padding: 1.5rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .type-selector { margin-bottom: 1.5rem; }
    .type-selector label { display: block; font-weight: 500; margin-bottom: 0.25rem; }
    .type-selector select { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; min-width: 250px; }
    .add-section { margin-bottom: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
    .add-section summary { font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; }
    .add-form .form-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
    .add-form .form-group { flex: 1; min-width: 150px; }
    .add-form label { display: block; font-size: 0.8125rem; margin-bottom: 0.25rem; }
    .add-form input { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .btn-primary { background: #1976d2; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { padding: 1rem; text-align: center; }
    .lookup-table { width: 100%; border-collapse: collapse; }
    .lookup-table th, .lookup-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .lookup-table th { background: #f5f5f5; font-weight: 600; font-size: 0.875rem; }
    .lookup-table tr.inactive { opacity: 0.6; }
    .active-badge { color: #2e7d32; font-size: 0.75rem; }
    .inactive-badge { color: #d32f2f; font-size: 0.75rem; }
    .btn-toggle { background: none; border: 1px solid #ccc; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
    .empty-state { text-align: center; padding: 1.5rem; color: #666; }
  `]
})
export class LookupTableEditorComponent implements OnInit {
  values = signal<LookupValue[]>([]);
  selectedType = signal<string | null>(null);
  loading = signal(false);

  readonly lookupTypes = [
    'RecordTypes',
    'ClassificationLevels',
    'StorageLocations',
    'Departments',
    'DisposalAuthorityReferences'
  ];

  addForm: FormGroup;

  constructor(
    private readonly api: ApiService,
    private readonly fb: FormBuilder
  ) {
    this.addForm = this.fb.group({
      code: ['', Validators.required],
      displayName: ['', Validators.required],
      sortOrder: [0]
    });
  }

  ngOnInit(): void {}

  onTypeChange(event: Event): void {
    const type = (event.target as HTMLSelectElement).value;
    if (type) {
      this.selectedType.set(type);
      this.loadValues(type);
    } else {
      this.selectedType.set(null);
      this.values.set([]);
    }
  }

  loadValues(type: string): void {
    this.loading.set(true);
    this.api.get<LookupValue[]>(`/admin/lookups/${type}`).subscribe({
      next: (vals) => {
        this.values.set(vals);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  addValue(): void {
    if (this.addForm.invalid || !this.selectedType()) return;

    this.api.post(`/admin/lookups/${this.selectedType()}`, this.addForm.value).subscribe({
      next: () => {
        this.addForm.reset({ code: '', displayName: '', sortOrder: 0 });
        this.loadValues(this.selectedType()!);
      }
    });
  }

  toggleActive(value: LookupValue): void {
    this.api.put(`/admin/lookups/${this.selectedType()}/${value.code}`, {
      isActive: !value.isActive
    }).subscribe({
      next: () => this.loadValues(this.selectedType()!)
    });
  }
}
