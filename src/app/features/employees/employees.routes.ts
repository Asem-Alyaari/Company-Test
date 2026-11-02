import { Routes } from '@angular/router';
import { EmployeeListComponent } from './pages/employee-list/employee-list.component';

export const EMPLOYEES_ROUTES: Routes = [
  {
    path: '',
    component: EmployeeListComponent
  }
];
