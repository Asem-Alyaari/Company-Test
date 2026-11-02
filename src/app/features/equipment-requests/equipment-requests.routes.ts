import { Routes } from '@angular/router';
import { RequestListComponent } from './pages/request-list/request-list.component';

export const EQUIPMENT_REQUESTS_ROUTES: Routes = [
  {
    path: '',
    component: RequestListComponent
  },
  {
    path: 'new',
    component: RequestListComponent,
    data: { openCreate: true }
  },
  {
    path: ':id',
    component: RequestListComponent,
    data: { openView: true }
  },
  {
    path: ':id/edit',
    component: RequestListComponent,
    data: { openEdit: true }
  }
];
