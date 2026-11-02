import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TableModule, TablePageEvent } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { EmptyStateComponent, FormErrorComponent, LoaderComponent } from '@shared';
import { Employee, EmployeeFormData } from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../../departments/services/department.service';

interface DropdownOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-employee-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    Dialog,
    Button,
    InputText,
    Select,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    FormErrorComponent
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeListComponent implements OnInit {
  protected readonly employeeService = inject(EmployeeService);
  protected readonly departmentService = inject(DepartmentService);
  protected readonly languageService = inject(LanguageService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly loading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingEmployee = signal<Employee | null>(null);

  readonly searchQuery = signal<string>('');
  readonly selectedDepartment = signal<string>('');
  readonly firstRowIndex = signal<number>(0);
  readonly rowsPerPage = signal<number>(5);
  readonly rowsPerPageOptions: number[] = [5, 10, 20];

  readonly departmentFilterOptions = computed<DropdownOption<string>[]>(() => [
    { label: this.languageService.translate('employees.allDepartments'), value: '' },
    ...this.departmentService.departments().map((d) => ({
      label: d.name,
      value: d.id
    }))
  ]);

  readonly departmentSelectOptions = computed<DropdownOption<string>[]>(() =>
    this.departmentService.departments().map((d) => ({
      label: `${d.name} (${d.code})`,
      value: d.id
    }))
  );

  private readonly emailUniqueValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const val = control.value ? String(control.value).trim().toLowerCase() : '';
    if (!val) {
      return null;
    }
    const currentId = this.editingEmployee()?.id;
    const exists = this.employeeService
      .employees()
      .some((e) => e.id !== currentId && e.email.trim().toLowerCase() === val);
    if (exists) {
      return {
        uniqueEmail: true,
        message: this.languageService.translate('employees.emailUnique')
      };
    }
    return null;
  };

  readonly employeeForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        this.emailUniqueValidator
      ]
    ],
    departmentId: ['', [Validators.required]],
    jobTitle: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['']
  });

  readonly dialogTitle = computed(() => {
    const emp = this.editingEmployee();
    return emp
      ? this.languageService.translate('employees.editTitle', { name: emp.name })
      : this.languageService.translate('employees.addTitle');
  });

  readonly filteredEmployees = computed<Employee[]>(() => {
    const all = this.employeeService.employees();
    const query = this.searchQuery().trim().toLowerCase();
    const deptId = this.selectedDepartment();

    return all.filter((emp) => {
      const matchesSearch =
        !query ||
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.jobTitle.toLowerCase().includes(query);

      const matchesDept = !deptId || emp.departmentId === deptId;
      return matchesSearch && matchesDept;
    });
  });

  readonly totalEmployeesCount = computed(() => this.filteredEmployees().length);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      departments: this.departmentService.loadDepartments(),
      employees: this.employeeService.loadEmployees()
    }).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notificationService.error(
          'Error',
          'Failed to load employees data. Please try again.'
        );
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.firstRowIndex.set(0);
  }

  onDepartmentFilterChange(value: string): void {
    this.selectedDepartment.set(value ?? '');
    this.firstRowIndex.set(0);
  }

  onPageChange(event: TablePageEvent): void {
    this.firstRowIndex.set(event.first);
    if (event.rows && event.rows !== this.rowsPerPage()) {
      this.rowsPerPage.set(event.rows);
    }
  }

  openCreateDialog(): void {
    this.editingEmployee.set(null);
    const defaultDept = this.departmentService.departments()[0]?.id ?? '';
    this.employeeForm.reset({
      name: '',
      email: '',
      departmentId: defaultDept,
      jobTitle: '',
      phone: ''
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(employee: Employee): void {
    this.editingEmployee.set(employee);
    this.employeeForm.reset({
      name: employee.name,
      email: employee.email,
      departmentId: employee.departmentId,
      jobTitle: employee.jobTitle,
      phone: employee.phone ?? ''
    });
    this.isDialogVisible.set(true);
  }

  closeDialog(): void {
    if (this.isSaving()) {
      return;
    }
    this.isDialogVisible.set(false);
    this.editingEmployee.set(null);
    this.employeeForm.reset();
  }

  onSave(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const raw = this.employeeForm.getRawValue();
    const payload: EmployeeFormData = {
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      departmentId: raw.departmentId,
      jobTitle: raw.jobTitle.trim(),
      phone: raw.phone.trim() || undefined
    };

    const currentEmp = this.editingEmployee();
    const request$ = currentEmp
      ? this.employeeService.updateEmployee(currentEmp.id, payload)
      : this.employeeService.createEmployee(payload);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.closeDialog();
        this.notificationService.success(
          this.languageService.translate('employees.saveSuccess', {
            name: saved.name
          })
        );
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error(
          'Save Failed',
          this.languageService.translate('employees.saveFailed')
        );
      }
    });
  }

  deleteEmployee(employee: Employee): void {
    this.confirmationService.confirm({
      header: this.languageService.translate('employees.deleteTitle'),
      message: this.languageService.translate('employees.deleteMessage', {
        name: employee.name
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: this.languageService.translate('employees.confirmDelete'),
        severity: 'danger'
      },
      rejectButtonProps: {
        label: this.languageService.translate('employees.cancelDelete'),
        severity: 'secondary'
      },
      accept: () => {
        this.employeeService.deleteEmployee(employee.id).subscribe({
          next: () => {
            this.notificationService.success(
              this.languageService.translate('employees.deleteSuccess', {
                name: employee.name
              })
            );
          },
          error: () => {
            this.notificationService.error(
              'Delete Failed',
              this.languageService.translate('employees.deleteFailed')
            );
          }
        });
      }
    });
  }
}
