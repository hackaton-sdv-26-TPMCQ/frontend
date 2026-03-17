import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

/** Routes : login (public), sites et compare (protégées par authGuard). */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sites' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [authGuard],
  },
  {
    path: 'sites',
    loadComponent: () =>
      import('./pages/sites/sites.page').then((m) => m.SitesPage),
    canActivate: [authGuard],
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./pages/compare/compare.page').then((m) => m.ComparePage),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'sites' },
];
