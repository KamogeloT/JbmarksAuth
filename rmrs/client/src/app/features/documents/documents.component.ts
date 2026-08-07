import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '@core/api';
import { HelpBannerComponent } from '../../shared/components/help-banner/help-banner.component';

interface RecentDocument {
  id: number;
  recordId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  currentVersion: number;
  createdAt: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, HelpBannerComponent],
  template: `
    <section class="documents-hub" aria-label="Electronic Document Control">
      <h1>Electronic Documents</h1>
      <p class="subtitle">Upload, version, and verify documents stored in Bitrix workgroup drives.</p>

      <app-help-banner
        title="Document Management"
        [tips]="[
          'To upload a document, first register a record in the Registry module.',
          'Then come here and click Upload Document — select the record to attach it to.',
          'Each document gets a SHA-256 checksum to verify integrity.',
          'Use versioning to track changes over time.',
          'Documents are stored in your department\\'s Bitrix drive automatically.'
        ]">
      </app-help-banner>

      <div class="action-cards">
        <div class="action-card info-card">
          <span class="card-icon">📂</span>
          <h3>Upload a Document</h3>
          <p>To upload a document, navigate to <strong>Registry → View All Records</strong>, open a record, and use the upload button. Documents are always attached to a registered record.</p>
          <a routerLink="/registry/list" class="card-link">Go to Records List →</a>
        </div>

        <div class="action-card">
          <span class="card-icon">🔍</span>
          <h3>Verify Document Integrity</h3>
          <p>Check if a document's checksum still matches the file stored on Bitrix. Detects unauthorized modifications.</p>
        </div>

        <div class="action-card">
          <span class="card-icon">📋</span>
          <h3>Version History</h3>
          <p>View all versions of a document. Each upload creates a new version with its own checksum.</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .documents-hub { padding: 1.5rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }
    .action-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
    .action-card {
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 1.5rem;
      background: #fff;
    }
    .info-card { border-color: #1976d2; background: #f3f8ff; }
    .card-icon { font-size: 2rem; display: block; margin-bottom: 0.75rem; }
    .action-card h3 { margin: 0 0 0.5rem; font-size: 1.05rem; color: #1976d2; }
    .action-card p { margin: 0; font-size: 0.85rem; color: #555; line-height: 1.4; }
    .card-link { display: inline-block; margin-top: 0.75rem; font-size: 0.875rem; color: #1976d2; text-decoration: none; font-weight: 500; }
    .card-link:hover { text-decoration: underline; }
  `]
})
export class DocumentsComponent {}
