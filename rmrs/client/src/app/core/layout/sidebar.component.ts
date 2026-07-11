import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../../shared/models/user.model';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: string[]; // If undefined, visible to all authenticated users
}

/**
 * Sidebar navigation component with role-based visibility.
 * Only shows navigation items the current user has permission to access.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar" role="navigation" aria-label="Main navigation">
      <ul class="sidebar__list">
        @for (item of visibleNavItems(); track item.path) {
          <li class="sidebar__item">
            <a
              [routerLink]="item.path"
              routerLinkActive="sidebar__link--active"
              class="sidebar__link"
              [attr.aria-label]="item.label">
              <span class="sidebar__icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="sidebar__label">{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width, 260px);
      background-color: var(--surface-color, #fff);
      border-right: 1px solid var(--border-color, rgba(0,0,0,0.12));
      overflow-y: auto;
      padding: 16px 0;
    }
    .sidebar__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      color: var(--text-primary, #333);
      text-decoration: none;
      font-size: 0.9rem;
      border-left: 3px solid transparent;
      transition: background-color 0.15s;
    }
    .sidebar__link:hover {
      background-color: rgba(0,0,0,0.04);
    }
    .sidebar__link--active {
      background-color: rgba(25,118,210,0.08);
      border-left-color: var(--primary-color, #1976d2);
      color: var(--primary-color, #1976d2);
      font-weight: 500;
    }
    .sidebar__icon {
      font-size: 1.2rem;
      width: 24px;
      text-align: center;
    }
  `]
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  private readonly allNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '\u{1F4CA}' },
    {
      label: 'File Plan',
      path: '/file-plan',
      icon: '\u{1F4C1}',
      roles: [UserRole.SystemAdministrator, UserRole.RecordsManager]
    },
    {
      label: 'Registry',
      path: '/registry',
      icon: '\u{1F4DD}',
      roles: [UserRole.SystemAdministrator, UserRole.RecordsManager, UserRole.RegistryClerk]
    },
    {
      label: 'Documents',
      path: '/documents',
      icon: '\u{1F4C4}',
      roles: [
        UserRole.SystemAdministrator,
        UserRole.RecordsManager,
        UserRole.RegistryClerk,
        UserRole.DepartmentUser,
        UserRole.DepartmentSupervisor
      ]
    },
    {
      label: 'Physical Records',
      path: '/physical-records',
      icon: '\u{1F4E6}',
      roles: [UserRole.SystemAdministrator, UserRole.RecordsManager, UserRole.RegistryClerk]
    },
    {
      label: 'Disposal',
      path: '/disposal',
      icon: '\u{1F5D1}',
      roles: [UserRole.SystemAdministrator, UserRole.RecordsManager, UserRole.ComplianceOfficer]
    },
    {
      label: 'Archive',
      path: '/archive',
      icon: '\u{1F3DB}',
      roles: [UserRole.SystemAdministrator, UserRole.Archivist]
    },
    { label: 'Search', path: '/search', icon: '\u{1F50D}' },
    {
      label: 'Reports',
      path: '/reports',
      icon: '\u{1F4C8}',
      roles: [
        UserRole.SystemAdministrator,
        UserRole.RecordsManager,
        UserRole.ComplianceOfficer,
        UserRole.ExecutiveViewer
      ]
    },
    {
      label: 'Audit',
      path: '/audit',
      icon: '\u{1F6E1}',
      roles: [UserRole.SystemAdministrator, UserRole.ComplianceOfficer, UserRole.Auditor]
    },
    {
      label: 'Security',
      path: '/security',
      icon: '\u{1F512}',
      roles: [UserRole.SystemAdministrator]
    },
    {
      label: 'Admin',
      path: '/admin',
      icon: '\u{2699}',
      roles: [UserRole.SystemAdministrator]
    }
  ];

  /**
   * Computed signal that filters nav items based on user's current roles.
   */
  readonly visibleNavItems = computed(() => {
    return this.allNavItems.filter(item => {
      // No role restriction — visible to all authenticated users
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      return this.authService.hasAnyRole(item.roles);
    });
  });
}
