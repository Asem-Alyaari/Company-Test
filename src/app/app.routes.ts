import { Routes } from '@angular/router';
import { authGuard, authMatchGuard, guestGuard } from '@core';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'equipment-requests'
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: 'equipment-requests',
    canActivate: [authGuard],
    canMatch: [authMatchGuard],
    loadChildren: () =>
      import('./features/equipment-requests/equipment-requests.routes').then(
        (m) => m.EQUIPMENT_REQUESTS_ROUTES
      )
  },
  {
    path: 'departments',
    canActivate: [authGuard],
    canMatch: [authMatchGuard],
    loadChildren: () =>
      import('./features/departments/departments.routes').then(
        (m) => m.DEPARTMENTS_ROUTES
      )
  },
  {
    path: '**',
    redirectTo: 'equipment-requests'
  }
];
