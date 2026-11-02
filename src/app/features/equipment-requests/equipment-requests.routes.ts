import { Routes } from '@angular/router';
import { RequestListComponent } from './pages/request-list/request-list.component';
import { RequestFormComponent } from './pages/request-form/request-form.component';
import { RequestDetailsComponent } from './pages/request-details/request-details.component';

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
    component: RequestDetailsComponent
  },
  {
    path: ':id/edit',
    component: RequestFormComponent
  }
];
