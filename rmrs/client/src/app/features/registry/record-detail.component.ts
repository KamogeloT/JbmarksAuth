import { Component, Input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { Record, Document, AuditLog } from '../../shared/models';
import { DateFormatPipe, ClassificationLevelPipe, RecordStatusPipe } from '../../shared/pipes';

/**
 * Component showing full metadata for a record including associated documents and audit history.
 */
@Component({
  selector: 'app-record-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DateFormatPipe, ClassificationLevelPipe, RecordStatusPipe],
  template: `
    <div class="record-detail" aria-label="Record detail view">
      @if (loading()) {
        <div class="loading" role="status" aria-live="polite">Loading record details...</div>
      } @else if (error()) {
        <div class="error-state" role="alert">{{ error() }}</div>
      } @else if (record()) {
        <div class="detail-header">
          <h2>{{ record()!.registryNumber }}</h2>
          <span class="status-badge">{{ record()!.status | recordStatus }}</span>
        </div>

        <div class="detail-sections">
          <!-- Metadata Section -->
          <section class="detail-section" aria-label="Record metadata">
            <h3>Record Metadata</h3>
            <div class="metadata-grid">
              <div class="meta-item">
                <span class="meta-label">Subject</span>
                <span class="meta-value">{{ record()!.subject }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Type</span>
                <span class="meta-value">{{ record()!.recordType }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Sender/Recipient</span>
                <span class="meta-value">{{ record()!.senderOrRecipient || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date Received/Sent</span>
                <span class="meta-value">{{ record()!.dateReceivedOrSent | dateFormat }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Classification Level</span>
                <span class="meta-value">{{ record()!.classificationLevel | classificationLevel }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Retention Expiry</span>
                <span class="meta-value">{{ record()!.retentionExpiryDate | dateFormat }}</span>
              </div>
              @if (record()!.externalReferenceNumber) {
                <div class="meta-item">
                  <span class="meta-label">External Reference</span>
                  <span class="meta-value">{{ record()!.externalReferenceNumber }}</span>
                </div>
              }
              @if (record()!.originatingOrganization) {
                <div class="meta-item">
                  <span class="meta-label">Originating Organization</span>
                  <span class="meta-value">{{ record()!.originatingOrganization }}</span>
                </div>
              }
              @if (record()!.correspondenceDate) {
                <div class="meta-item">
                  <span class="meta-label">Correspondence Date</span>
                  <span class="meta-value">{{ record()!.correspondenceDate | dateFormat }}</span>
                </div>
              }
              <div class="meta-item">
                <span class="meta-label">Created</span>
                <span class="meta-value">{{ record()!.createdAt | dateFormat:'long' }}</span>
              </div>
            </div>
          </section>

          <!-- Documents Section -->
          <section class="detail-section" aria-label="Associated documents">
            <div class="section-header">
              <h3>Documents ({{ documents().length }})</h3>
              <a [routerLink]="['/documents/upload', recordId]" class="btn btn-upload" aria-label="Upload document to this record">
                📎 Upload Document
              </a>
            </div>
            @if (documents().length > 0) {
              <div class="documents-list">
                @for (doc of documents(); track doc.id) {
                  <div class="document-item">
                    <div class="doc-info">
                      <span class="doc-name">{{ doc.fileName }}</span>
                      <span class="doc-meta">Version {{ doc.currentVersion }} | {{ formatFileSize(doc.fileSize) }}</span>
                    </div>
                    <button class="btn btn-sm" (click)="downloadDocument(doc.id)" [attr.aria-label]="'Download ' +  doc.fileName  + ''">
                      Download
                    </button>
                  </div>
                }
              </div>
            } @else {
              <p class="empty-list">No documents attached to this record.</p>
            }
          </section>

          <!-- Audit History Section -->
          <section class="detail-section" aria-label="Audit history">
            <h3>Audit History</h3>
            @if (auditLoading()) {
              <div class="loading" role="status">Loading audit history...</div>
            } @else if (auditLogs().length > 0) {
              <div class="audit-list">
                @for (log of auditLogs(); track log.id) {
                  <div class="audit-item">
                    <div class="audit-header">
                      <span class="audit-action">{{ log.actionType }}</span>
                      <span class="audit-time">{{ log.timestamp | dateFormat:'long' }}</span>
                    </div>
                    <div class="audit-details">
                      <span>User ID: {{ log.userId }}</span>
                      @if (log.previousValue) {
                        <span class="audit-change">Changed from: {{ log.previousValue }}</span>
                      }
                      @if (log.newValue) {
                        <span class="audit-change">Changed to: {{ log.newValue }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="empty-list">No audit history available.</p>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .record-detail { padding: 1.5rem; }
    .loading { text-align: center; padding: 2rem; color: #666; }
    .error-state { text-align: center; padding: 2rem; color: #d32f2f; }
    .detail-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .detail-header h2 { margin: 0; font-size: 1.5rem; }
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #e8f5e9; color: #2e7d32; }
    .detail-sections { display: flex; flex-direction: column; gap: 2rem; }
    .detail-section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; }
    .detail-section h3 { margin: 0 0 1rem; font-size: 1rem; color: #333; border-bottom: 1px solid #f0f0f0; padding-bottom: 0.5rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 0.5rem; margin-bottom: 1rem; }
    .section-header h3 { margin: 0; border: none; padding: 0; }
    .btn-upload { padding: 0.375rem 0.875rem; background: #4caf50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8125rem; text-decoration: none; font-weight: 500; }
    .btn-upload:hover { background: #388e3c; }
    .metadata-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
    .meta-value { font-size: 0.9375rem; color: #222; }
    .documents-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .document-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #f9f9f9; border-radius: 4px; }
    .doc-info { display: flex; flex-direction: column; }
    .doc-name { font-weight: 500; }
    .doc-meta { font-size: 0.75rem; color: #666; }
    .btn-sm { padding: 0.375rem 0.75rem; background: #1976d2; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8125rem; }
    .btn-sm:hover { background: #1565c0; }
    .empty-list { color: #666; font-size: 0.875rem; margin: 0; }
    .audit-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .audit-item { border-left: 3px solid #1976d2; padding: 0.5rem 0.75rem; background: #f9f9f9; border-radius: 0 4px 4px 0; }
    .audit-header { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
    .audit-action { font-weight: 600; font-size: 0.875rem; }
    .audit-time { font-size: 0.75rem; color: #666; }
    .audit-details { font-size: 0.8125rem; color: #555; display: flex; flex-direction: column; gap: 0.125rem; }
    .audit-change { font-style: italic; }
  `]
})
export class RecordDetailComponent implements OnInit {
  @Input({ alias: 'id' }) recordId!: number;

  private readonly api = inject(ApiService);

  record = signal<Record | null>(null);
  documents = signal<Document[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  loading = signal<boolean>(true);
  auditLoading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    this.loadRecord();
  }

  private loadRecord(): void {
    this.loading.set(true);
    this.api.get<Record>(`/records/${this.recordId}`).subscribe({
      next: (record) => {
        this.record.set(record);
        this.loading.set(false);
        this.loadDocuments();
        this.loadAuditHistory();
      },
      error: () => {
        this.error.set('Failed to load record details.');
        this.loading.set(false);
      }
    });
  }

  private loadDocuments(): void {
    this.api.get<Document[]>(`/records/${this.recordId}/documents`).subscribe({
      next: (docs) => this.documents.set(docs),
      error: () => {} // Silently handle - documents are supplementary
    });
  }

  private loadAuditHistory(): void {
    this.auditLoading.set(true);
    this.api.get<AuditLog[]>(`/records/${this.recordId}/history`).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs);
        this.auditLoading.set(false);
      },
      error: () => this.auditLoading.set(false)
    });
  }

  downloadDocument(documentId: number): void {
    this.api.download(`/documents/${documentId}/download`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'document';
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }
}
