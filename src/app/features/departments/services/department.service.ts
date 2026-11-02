import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '@core';
import { Department, DepartmentFormData } from '../../departments/models/department.model';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly apiService = inject(ApiService);

  private readonly departmentsSignal = signal<Department[]>([]);

  readonly departments = this.departmentsSignal.asReadonly();
  readonly departmentMap = computed(() => new Map(this.departmentsSignal().map((d) => [d.id, d.name])));

  loadDepartments(): Observable<Department[]> {
    return this.apiService.get<Department[]>('departments').pipe(
      tap((deps) => {
        this.departmentsSignal.set(deps);
      })
    );
  }

  getById(id: string): Observable<Department> {
    return this.apiService.getById<Department>('departments', id);
  }

  create(department: DepartmentFormData): Observable<Department> {
    return this.apiService.post<Department, DepartmentFormData>('departments', department).pipe(
      tap((newDept) => {
        this.departmentsSignal.update((list) => [...list, newDept]);
      })
    );
  }

  update(id: string, department: DepartmentFormData): Observable<Department> {
    return this.apiService.put<Department, DepartmentFormData>('departments', id, department).pipe(
      tap((updatedDept) => {
        this.departmentsSignal.update((list) =>
          list.map((d) => (d.id === id ? updatedDept : d))
        );
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.apiService.delete<void>('departments', id).pipe(
      tap(() => {
        this.departmentsSignal.update((list) => list.filter((d) => d.id !== id));
      })
    );
  }

  getDepartmentName(departmentId: string): string {
    return this.departmentMap().get(departmentId) || '-';
  }
}
