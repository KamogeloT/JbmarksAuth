import { Routes } from '@angular/router';

export const SECURITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./security.component').then(m => m.SecurityComponent)
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./role-management.component').then(m => m.RoleManagementComponent)
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./department-mapping.component').then(m => m.DepartmentMappingComponent)
  }
];
