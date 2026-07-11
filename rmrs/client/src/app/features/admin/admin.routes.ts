import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'config',
    loadComponent: () =>
      import('./system-config.component').then(m => m.SystemConfigComponent)
  },
  {
    path: 'lookups',
    loadComponent: () =>
      import('./lookup-table-editor.component').then(m => m.LookupTableEditorComponent)
  }
];
