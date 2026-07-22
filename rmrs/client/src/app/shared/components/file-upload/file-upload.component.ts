import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Result emitted when files are selected for upload.
 */
export interface FileSelectEvent {
  files: File[];
  valid: boolean;
  errors: string[];
}

/**
 * Reusable drag-and-drop file upload component with size validation.
 * Supports configurable max file size and accepted file types.
 */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="file-upload"
      [class.drag-over]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      role="button"
      tabindex="0"
      [attr.aria-label]="'File upload area. ' + dropZoneLabel()"
      (keydown.enter)="fileInput.click()"
      (keydown.space)="fileInput.click()">

      <input
        #fileInput
        type="file"
        class="file-input"
        [accept]="acceptTypes()"
        [multiple]="multiple()"
        (change)="onFileSelected($event)"
        aria-hidden="true"
        tabindex="-1" />

      @if (selectedFiles().length === 0) {
        <div class="upload-placeholder">
          <span class="upload-icon" aria-hidden="true">&#128194;</span>
          <p class="upload-text">{{ dropZoneLabel() }}</p>
          <button class="browse-btn" type="button" (click)="fileInput.click()">
            Browse Files
          </button>
          <p class="upload-hint">
            Max file size: {{ formatSize(maxSizeBytes()) }}
          </p>
        </div>
      } @else {
        <div class="selected-files">
          @for (file of selectedFiles(); track file.name) {
            <div class="file-item">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">({{ formatSize(file.size) }})</span>
              <button class="remove-btn" (click)="removeFile(file)" [attr.aria-label]="'Remove ' + file.name">
                &times;
              </button>
            </div>
          }
        </div>
      }

      @if (errors().length > 0) {
        <div class="error-messages" role="alert">
          @for (error of errors(); track error) {
            <p class="error">{{ error }}</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .file-upload {
      border: 2px dashed #ccc; border-radius: 8px; padding: 2rem; text-align: center;
      transition: border-color 0.2s, background 0.2s; cursor: pointer;
    }
    .file-upload:hover, .file-upload.drag-over { border-color: #1976d2; background: #e3f2fd; }
    .file-input { display: none; }
    .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .upload-icon { font-size: 2.5rem; }
    .upload-text { font-size: 0.9375rem; color: #555; margin: 0; }
    .upload-hint { font-size: 0.8125rem; color: #888; margin: 0; }
    .browse-btn { padding: 0.5rem 1.25rem; background: #1976d2; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .browse-btn:hover { background: #1565c0; }
    .selected-files { display: flex; flex-direction: column; gap: 0.5rem; text-align: left; }
    .file-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; }
    .file-name { font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-size { color: #666; font-size: 0.8125rem; }
    .remove-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #d32f2f; padding: 0 0.25rem; }
    .error-messages { margin-top: 0.75rem; }
    .error { color: #d32f2f; font-size: 0.8125rem; margin: 0.25rem 0; }
  `]
})
export class FileUploadComponent {
  /** Maximum allowed file size in bytes (default 100MB) */
  maxSizeBytes = input<number>(100 * 1024 * 1024);

  /** Accepted file types (HTML accept attribute value) */
  acceptTypes = input<string>('');

  /** Allow multiple file selection */
  multiple = input<boolean>(false);

  /** Custom drop zone label */
  dropZoneLabel = input<string>('Drag and drop files here or click to browse');

  /** Emitted when files are selected/validated */
  filesSelected = output<FileSelectEvent>();

  /** Internal state */
  isDragOver = signal<boolean>(false);
  selectedFiles = signal<File[]>([]);
  errors = signal<string[]>([]);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  removeFile(file: File): void {
    this.selectedFiles.update(files => files.filter(f => f !== file));
    this.errors.set([]);
    this.filesSelected.emit({ files: this.selectedFiles(), valid: true, errors: [] });
  }

  private processFiles(files: File[]): void {
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > this.maxSizeBytes()) {
        validationErrors.push(`"${file.name}" exceeds the maximum size of ${this.formatSize(this.maxSizeBytes())}.`);
      } else {
        validFiles.push(file);
      }
    }

    if (this.multiple()) {
      this.selectedFiles.update(existing => [...existing, ...validFiles]);
    } else {
      this.selectedFiles.set(validFiles.slice(0, 1));
    }

    this.errors.set(validationErrors);
    this.filesSelected.emit({
      files: this.selectedFiles(),
      valid: validationErrors.length === 0,
      errors: validationErrors
    });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }
}
