import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { Document } from '../../shared/models';
import { FileUploadComponent, FileSelectEvent } from '../../shared/components/file-upload/file-upload.component';

/**
 * Component for uploading documents with drag-and-drop support,
 * file size validation (100MB limit), and upload progress indicator.
 */
@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  template: `
    <div class="document-upload" aria-label="Document upload">
      <h3>Upload Document</h3>
      <p class="upload-info">Upload a document to associate with the record. Maximum file size: 100 MB.</p>

      <app-file-upload
        [maxSizeBytes]="maxFileSize"
        [multiple]="false"
        dropZoneLabel="Drag and drop a document here or click to browse"
        (filesSelected)="onFilesSelected($event)" />

      @if (uploading()) {
        <div class="upload-progress" role="progressbar" aria-label="Upload progress" [attr.aria-valuenow]="uploadProgress()">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="uploadProgress()"></div>
          </div>
          <span class="progress-text">Uploading... {{ uploadProgress() }}%</span>
        </div>
      }

      @if (uploadError()) {
        <div class="upload-error" role="alert">
          <p>{{ uploadError() }}</p>
          <button class="btn btn-secondary" (click)="retryUpload()" aria-label="Retry upload">Retry</button>
        </div>
      }

      @if (uploadSuccess()) {
        <div class="upload-success" role="status">
          <p>Document uploaded successfully!</p>
          @if (uploadedDocument()) {
            <div class="uploaded-info">
              <span>File: {{ uploadedDocument()!.fileName }}</span>
              <span>Version: {{ uploadedDocument()!.currentVersion }}</span>
            </div>
          }
        </div>
      }

      @if (selectedFile() && !uploading() && !uploadSuccess()) {
        <div class="upload-actions">
          <button class="btn btn-primary" (click)="startUpload()" [disabled]="!selectedFile()" aria-label="Upload selected file">
            Upload Document
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .document-upload { padding: 1.5rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; }
    h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
    .upload-info { font-size: 0.875rem; color: #666; margin: 0 0 1.5rem; }
    .upload-progress { margin-top: 1rem; }
    .progress-bar { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #1976d2; transition: width 0.3s ease; border-radius: 4px; }
    .progress-text { font-size: 0.8125rem; color: #666; margin-top: 0.5rem; display: block; }
    .upload-error { margin-top: 1rem; background: #ffebee; padding: 0.75rem; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; }
    .upload-error p { margin: 0; color: #c62828; font-size: 0.875rem; }
    .upload-success { margin-top: 1rem; background: #e8f5e9; padding: 0.75rem; border-radius: 4px; }
    .upload-success p { margin: 0 0 0.5rem; color: #2e7d32; font-weight: 500; }
    .uploaded-info { font-size: 0.8125rem; color: #555; display: flex; gap: 1rem; }
    .upload-actions { margin-top: 1rem; display: flex; justify-content: flex-end; }
    .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #f5f5f5; border: 1px solid #ccc; color: #333; padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
  `]
})
export class DocumentUploadComponent {
  @Input() recordId!: number;
  @Input() documentId: number | null = null; // If set, uploads as new version

  private readonly api = inject(ApiService);

  readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  selectedFile = signal<File | null>(null);
  uploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  uploadError = signal<string>('');
  uploadSuccess = signal<boolean>(false);
  uploadedDocument = signal<Document | null>(null);

  onFilesSelected(event: FileSelectEvent): void {
    if (event.valid && event.files.length > 0) {
      this.selectedFile.set(event.files[0]);
      this.uploadError.set('');
      this.uploadSuccess.set(false);
    } else {
      this.selectedFile.set(null);
    }
  }

  startUpload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadSuccess.set(false);

    const formData = new FormData();
    formData.append('file', file, file.name);

    // Simulate progress
    const progressInterval = setInterval(() => {
      this.uploadProgress.update(p => Math.min(p + 10, 90));
    }, 500);

    const endpoint = this.documentId
      ? `/documents/${this.documentId}/versions`
      : `/records/${this.recordId}/documents`;

    this.api.upload<Document>(endpoint, formData).subscribe({
      next: (doc) => {
        clearInterval(progressInterval);
        this.uploadProgress.set(100);
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        this.uploadedDocument.set(doc);
        this.selectedFile.set(null);
      },
      error: (err) => {
        clearInterval(progressInterval);
        this.uploading.set(false);
        this.uploadProgress.set(0);
        this.uploadError.set(err.error?.message || 'Upload failed. Please check your connection and try again.');
      }
    });
  }

  retryUpload(): void {
    this.uploadError.set('');
    if (this.selectedFile()) {
      this.startUpload();
    }
  }
}
