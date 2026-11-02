import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { ApiService } from '@core';
import { Employee, EmployeeFormData } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly apiService = inject(ApiService);
  private readonly endpoint = 'employees';

  private readonly employeesSignal = signal<Employee[]>([]);
  readonly employees = this.employeesSignal.asReadonly();

  loadEmployees(): Observable<Employee[]> {
    return this.apiService.get<Employee[]>(this.endpoint).pipe(
      tap((employees) => {
        this.employeesSignal.set(employees);
      })
    );
  }

  getEmployee(id: string): Observable<Employee> {
    return this.apiService.getById<Employee>(this.endpoint, id).pipe(
      tap((emp) => {
        this.employeesSignal.update((existing) => {
          const idx = existing.findIndex((e) => e.id === emp.id);
          if (idx >= 0) {
            const copy = [...existing];
            copy[idx] = emp;
            return copy;
          }
          return [...existing, emp];
        });
      })
    );
  }

  searchEmployees(query: string): Observable<Employee[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return of([]);
    }
    return this.apiService.get<Employee[]>(this.endpoint, { q: query }).pipe(
      map((list) =>
        list.filter(
          (emp) =>
            emp.name.toLowerCase().includes(q) ||
            emp.jobTitle.toLowerCase().includes(q) ||
            emp.email.toLowerCase().includes(q)
        )
      ),
      tap((results) => {
        this.employeesSignal.update((existing) => {
          const map = new Map(existing.map((e) => [e.id, e]));
          for (const r of results) {
            map.set(r.id, r);
          }
          return Array.from(map.values());
        });
      })
    );
  }

  createEmployee(payload: EmployeeFormData): Observable<Employee> {
    return this.apiService.post<Employee, EmployeeFormData>(this.endpoint, payload).pipe(
      tap((created) => {
        this.employeesSignal.update((list) => [...list, created]);
      })
    );
  }

  updateEmployee(id: string, payload: Partial<Employee>): Observable<Employee> {
    return this.apiService.patch<Employee, Partial<Employee>>(this.endpoint, id, payload).pipe(
      tap((updated) => {
        this.employeesSignal.update((list) =>
          list.map((emp) => (emp.id === id ? { ...emp, ...updated } : emp))
        );
      })
    );
  }

  deleteEmployee(id: string): Observable<void> {
    return this.apiService.delete<void>(this.endpoint, id).pipe(
      tap(() => {
        this.employeesSignal.update((list) => list.filter((emp) => emp.id !== id));
      })
    );
  }

  getEmployeeById(id: string | undefined): Employee | undefined {
    if (!id) return undefined;
    return this.employeesSignal().find((emp) => emp.id === id);
  }

  getEmployeeName(id: string | undefined): string {
    if (!id) return '-';
    const emp = this.employeesSignal().find((e) => e.id === id);
    return emp ? emp.name : '-';
  }

  isEmailUnique(email: string, excludeId?: string): Observable<boolean> {
    return this.apiService.get<Employee[]>(this.endpoint).pipe(
      map((list) => {
        const normalized = email.trim().toLowerCase();
        const found = list.find(
          (e) => e.email.trim().toLowerCase() === normalized && e.id !== excludeId
        );
        return !found;
      })
    );
  }
}
