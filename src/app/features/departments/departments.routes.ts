import { Routes } from '@angular/router';
import { DepartmentListComponent } from './pages/department-list/department-list.component';

export const DEPARTMENTS_ROUTES: Routes = [
  {
    path: '',
    component: DepartmentListComponent
  }
];
