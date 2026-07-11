import { Routes } from '@angular/router';

export const PHYSICAL_RECORDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./physical-records.component').then(m => m.PhysicalRecordsComponent)
  },
  {
    path: 'scan',
    loadComponent: () =>
      import('./physical-record-scan.component').then(m => m.PhysicalRecordScanComponent)
  },
  {
    path: 'locations',
    loadComponent: () =>
      import('./location-tree.component').then(m => m.LocationTreeComponent)
  },
  {
    path: 'move',
    loadComponent: () =>
      import('./move-record.component').then(m => m.MoveRecordComponent)
  },
  {
    path: 'overdue-loans',
    loadComponent: () =>
      import('./overdue-loans-list.component').then(m => m.OverdueLoansListComponent)
  }
];
