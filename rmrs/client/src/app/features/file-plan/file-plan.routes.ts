import { Routes } from '@angular/router';

export const FILE_PLAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./file-plan.component').then(m => m.FilePlanComponent)
  },
  {
    path: 'tree',
    loadComponent: () =>
      import('./file-plan-tree.component').then(m => m.FilePlanTreeComponent)
  },
  {
    path: 'retention-rules',
    loadComponent: () =>
      import('./retention-rule-list.component').then(m => m.RetentionRuleListComponent)
  }
];
