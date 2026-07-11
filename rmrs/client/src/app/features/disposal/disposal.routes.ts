import { Routes } from '@angular/router';

export const DISPOSAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./disposal.component').then(m => m.DisposalComponent)
  },
  {
    path: 'candidates',
    loadComponent: () =>
      import('./disposal-candidates.component').then(m => m.DisposalCandidatesComponent)
  },
  {
    path: 'batch',
    loadComponent: () =>
      import('./disposal-batch.component').then(m => m.DisposalBatchComponent)
  },
  {
    path: 'batch/:id',
    loadComponent: () =>
      import('./disposal-batch.component').then(m => m.DisposalBatchComponent)
  },
  {
    path: 'certificate/:id',
    loadComponent: () =>
      import('./disposal-certificate.component').then(m => m.DisposalCertificateComponent)
  }
];
