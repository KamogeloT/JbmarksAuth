import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./documents.component').then(m => m.DocumentsComponent)
  },
  {
    path: 'upload/:recordId',
    loadComponent: () =>
      import('./document-upload.component').then(m => m.DocumentUploadComponent)
  },
  {
    path: ':id/versions',
    loadComponent: () =>
      import('./document-version-list.component').then(m => m.DocumentVersionListComponent)
  },
  {
    path: ':id/verify',
    loadComponent: () =>
      import('./document-verify.component').then(m => m.DocumentVerifyComponent)
  }
];
