import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { ShellComponent } from './core/layout/shell.component';
import { LoginComponent } from './core/auth/login.component';
import { AccessDeniedComponent } from './core/auth/access-denied.component';
import { UserRole } from './shared/models/user.model';

export const routes: Routes = [
  // Public routes (no auth required)
  {
    path: 'auth/login',
    component: LoginComponent
  },
  {
    path: 'access-denied',
    component: AccessDeniedComponent
  },

  // Authenticated routes wrapped in shell layout
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'file-plan',
        loadChildren: () =>
          import('./features/file-plan/file-plan.routes').then(m => m.FILE_PLAN_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.RecordsManager
          ]
        }
      },
      {
        path: 'registry',
        loadChildren: () =>
          import('./features/registry/registry.routes').then(m => m.REGISTRY_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.RecordsManager,
            UserRole.RegistryClerk
          ]
        }
      },
      {
        path: 'documents',
        loadChildren: () =>
          import('./features/documents/documents.routes').then(m => m.DOCUMENTS_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.RecordsManager,
            UserRole.RegistryClerk,
            UserRole.DepartmentUser,
            UserRole.DepartmentSupervisor
          ]
        }
      },
      {
        path: 'physical-records',
        loadChildren: () =>
          import('./features/physical-records/physical-records.routes').then(m => m.PHYSICAL_RECORDS_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.RecordsManager,
            UserRole.RegistryClerk
          ]
        }
      },
      {
        path: 'disposal',
        loadChildren: () =>
          import('./features/disposal/disposal.routes').then(m => m.DISPOSAL_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.RecordsManager,
            UserRole.ComplianceOfficer
          ]
        }
      },
      {
        path: 'archive',
        loadChildren: () =>
          import('./features/archive/archive.routes').then(m => m.ARCHIVE_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.Archivist
          ]
        }
      },
      {
        path: 'search',
        loadChildren: () =>
          import('./features/search/search.routes').then(m => m.SEARCH_ROUTES)
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.RecordsManager,
            UserRole.ComplianceOfficer,
            UserRole.ExecutiveViewer
          ]
        }
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./features/audit/audit.routes').then(m => m.AUDIT_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [
            UserRole.SystemAdministrator,
            UserRole.ComplianceOfficer,
            UserRole.Auditor
          ]
        }
      },
      {
        path: 'security',
        loadChildren: () =>
          import('./features/security/security.routes').then(m => m.SECURITY_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.SystemAdministrator]
        }
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.SystemAdministrator]
        }
      }
    ]
  },

  // Wildcard redirect
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
