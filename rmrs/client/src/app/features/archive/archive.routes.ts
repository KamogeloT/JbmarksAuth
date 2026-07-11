import { Routes } from '@angular/router';

export const ARCHIVE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./archive.component').then(m => m.ArchiveComponent)
  },
  {
    path: 'batch',
    loadComponent: () =>
      import('./archive-transfer-batch.component').then(m => m.ArchiveTransferBatchComponent)
  },
  {
    path: 'batch/:id',
    loadComponent: () =>
      import('./archive-transfer-batch.component').then(m => m.ArchiveTransferBatchComponent)
  },
  {
    path: 'batch/:id/manifest',
    loadComponent: () =>
      import('./transfer-manifest.component').then(m => m.TransferManifestComponent)
  }
];
