import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./report-list.component').then(m => m.ReportListComponent)
  },
  {
    path: 'generate',
    loadComponent: () =>
      import('./report-generator.component').then(m => m.ReportGeneratorComponent)
  }
];
