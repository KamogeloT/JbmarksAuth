import { Routes } from '@angular/router';

export const REGISTRY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./registry.component').then(m => m.RegistryComponent)
  },
  {
    path: 'incoming',
    loadComponent: () =>
      import('./register-incoming.component').then(m => m.RegisterIncomingComponent)
  },
  {
    path: 'outgoing',
    loadComponent: () =>
      import('./register-outgoing.component').then(m => m.RegisterOutgoingComponent)
  },
  {
    path: 'internal',
    loadComponent: () =>
      import('./register-internal.component').then(m => m.RegisterInternalComponent)
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./record-list.component').then(m => m.RecordListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./record-detail.component').then(m => m.RecordDetailComponent)
  }
];
