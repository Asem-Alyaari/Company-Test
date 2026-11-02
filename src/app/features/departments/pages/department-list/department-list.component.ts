import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { TableModule, TablePageEvent } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { EmptyStateComponent, FormErrorComponent, LoaderComponent } from '@shared';
import { Department, DepartmentFormData } from '../../models/department.model';
import { DepartmentService } from '../../services/department.service';

@Component({
  selector: 'app-department-list',
  imports: [
    ReactiveFormsModule,
    TableModule,
    Dialog,
    Button,
    InputText,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    FormErrorComponent
  ],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentListComponent implements OnInit {
  protected readonly departmentService = inject(DepartmentService);
  protected readonly languageService = inject(LanguageService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly loading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingDepartment = signal<Department | null>(null);

  readonly searchQuery = signal<string>('');
  readonly firstRowIndex = signal<number>(0);
  readonly rowsPerPage = signal<number>(5);
  readonly rowsPerPageOptions: number[] = [5, 10, 20];

  private readonly codeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const val = control.value ? String(control.value).trim().toUpperCase() : '';
    if (!val) {
      return null;
    }
    const currentId = this.editingDepartment()?.id;
    const exists = this.departmentService
      .departments()
      .some((d) => d.id !== currentId && d.code.toUpperCase() === val);
    if (exists) {
      return {
        uniqueCode: true,
        message: this.languageService.translate('departments.codeUnique')
      };
    }
    return null;
  };

  private readonly nameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const val = control.value ? String(control.value).trim().toLowerCase() : '';
    if (!val) {
      return null;
    }
    const currentId = this.editingDepartment()?.id;
    const exists = this.departmentService
      .departments()
      .some((d) => d.id !== currentId && d.name.toLowerCase() === val);
    if (exists) {
      return {
        uniqueName: true,
        message: this.languageService.translate('departments.nameUnique')
      };
    }
    return null;
  };

  readonly departmentForm = this.fb.group({
    code: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9]{2,10}$/),
        this.codeValidator
      ]
    ],
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        this.nameValidator
      ]
    ]
  });

  readonly filteredDepartments = computed<Department[]>(() => {
    const list = this.departmentService.departments();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter(
      (dept) =>
        dept.code.toLowerCase().includes(query) ||
        dept.name.toLowerCase().includes(query)
    );
  });

  readonly visibleCount = computed<number>(() => this.filteredDepartments().length);

  readonly dialogTitle = computed<string>(() => {
    const editing = this.editingDepartment();
    return editing
      ? this.languageService.translate('departments.editTitle', { code: editing.code })
      : this.languageService.translate('departments.addTitle');
  });

  readonly pageReportTemplate = computed<string>(() =>
    this.languageService.translate('requests.pageReport')
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.departmentService.loadDepartments().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.firstRowIndex.set(0);
  }

  onPageChange(event: TablePageEvent): void {
    this.firstRowIndex.set(event.first);
    if (event.rows && event.rows !== this.rowsPerPage()) {
      this.rowsPerPage.set(event.rows);
    }
  }

  openAddDialog(): void {
    this.editingDepartment.set(null);
    this.departmentForm.reset({
      code: '',
      name: ''
    });
    this.departmentForm.markAsPristine();
    this.departmentForm.markAsUntouched();
    this.isDialogVisible.set(true);
  }

  openEditDialog(department: Department): void {
    this.editingDepartment.set(department);
    this.departmentForm.reset({
      code: department.code,
      name: department.name
    });
    this.departmentForm.markAsPristine();
    this.departmentForm.markAsUntouched();
    this.isDialogVisible.set(true);
  }

  closeDialog(): void {
    if (this.isSaving()) {
      return;
    }
    this.isDialogVisible.set(false);
    this.editingDepartment.set(null);
    this.departmentForm.reset();
  }

  onSave(): void {
    this.departmentForm.controls.code.updateValueAndValidity();
    this.departmentForm.controls.name.updateValueAndValidity();

    if (this.departmentForm.invalid) {
      this.departmentForm.markAllAsTouched();
      return;
    }

    const raw = this.departmentForm.getRawValue();
    const payload: DepartmentFormData = {
      code: raw.code.trim().toUpperCase(),
      name: raw.name.trim()
    };

    this.isSaving.set(true);
    const editing = this.editingDepartment();
    const request$ = editing
      ? this.departmentService.update(editing.id, payload)
      : this.departmentService.create(payload);

    request$.subscribe({
      next: (savedDept) => {
        this.isSaving.set(false);
        this.isDialogVisible.set(false);
        this.editingDepartment.set(null);
        this.notificationService.success(
          this.languageService.translate('departments.title'),
          this.languageService.translate('departments.saveSuccess', { name: savedDept.name })
        );
        this.loadData();
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const msg =
          err instanceof Error
            ? err.message
            : this.languageService.translate('departments.saveFailed');
        this.notificationService.error(
          this.languageService.translate('departments.title'),
          msg
        );
      }
    });
  }

  deleteDepartment(department: Department): void {
    this.confirmationService.confirm({
      header: this.languageService.translate('departments.deleteTitle'),
      message: this.languageService.translate('departments.deleteMessage', {
        name: department.name,
        code: department.code
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: this.languageService.translate('departments.confirmDelete'),
        severity: 'danger'
      },
      rejectButtonProps: {
        label: this.languageService.translate('departments.cancelDelete'),
        severity: 'secondary'
      },
      accept: () => {
        this.departmentService.delete(department.id).subscribe({
          next: () => {
            this.notificationService.success(
              this.languageService.translate('departments.title'),
              this.languageService.translate('departments.deleteSuccess', {
                name: department.name
              })
            );
          },
          error: (err: unknown) => {
            const msg =
              err instanceof Error
                ? err.message
                : this.languageService.translate('departments.deleteFailed');
            this.notificationService.error(
              this.languageService.translate('departments.title'),
              msg
            );
          }
        });
      }
    });
  }
}
