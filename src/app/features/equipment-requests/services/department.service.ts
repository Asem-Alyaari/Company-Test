import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '@core';
import { Department } from '../models/equipment-request.model';

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

  getDepartmentName(departmentId: string): string {
    return this.departmentMap().get(departmentId) ?? departmentId;
  }
}
