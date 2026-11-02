import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal
} from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { FormErrorComponent } from '@shared';
import {
  EQUIPMENT_ITEMS,
  EquipmentItem,
  EquipmentRequest,
  EquipmentStatus
} from '../../models/equipment-request.model';
import { EquipmentRequestService } from '../../services/equipment-request.service';
import { DepartmentService } from '../../../departments/services/department.service';
import { EmployeeService } from '../../../employees/services/employee.service';
import { Employee } from '../../../employees/models/employee.model';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function neededOnValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return { required: true };
  }
  const val = typeof control.value === 'string' ? control.value.slice(0, 10) : '';
  const today = getTodayString();
  if (val && val < today) {
    return { datePast: true };
  }
  return null;
}

function costValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return { required: true };
  }
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return { costPositive: true };
  }
  const str = String(value);
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (decimals && decimals.length > 2) {
      return { costDecimals: true };
    }
  }
  return null;
}

function quantityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return { required: true };
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 10) {
    return { quantityRange: true };
  }
  return null;
}

@Component({
  selector: 'app-request-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Dialog,
    InputText,
    Textarea,
    Select,
    AutoComplete,
    Button,
    TranslatePipe,
    FormErrorComponent
  ],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly requestService = inject(EquipmentRequestService);
  protected readonly departmentService = inject(DepartmentService);
  protected readonly employeeService = inject(EmployeeService);
  protected readonly languageService = inject(LanguageService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  // Model & Inputs
  readonly visible = model<boolean>(false);
  readonly request = input<EquipmentRequest | null>(null);

  // Outputs
  readonly saved = output<EquipmentRequest>();
  readonly cancelled = output<void>();

  // Internal Component State
  readonly editingId = signal<string | null>(null);
  readonly currentStatus = signal<EquipmentStatus>('Draft');
  readonly isSaving = signal<boolean>(false);
  readonly targetStatus = signal<EquipmentStatus>('Draft');
  readonly minDateString = getTodayString();

  readonly isAddMode = computed(() => !this.editingId());
  readonly isReadOnly = computed(() => {
    const status = this.currentStatus();
    return status === 'Rejected' || status === 'Delivered';
  });

  readonly dialogTitle = computed(() => {
    const isEdit = !this.isAddMode();
    const reqNum = this.requestForm.controls.requestNumber.value;
    return isEdit
      ? this.languageService.translate('form.editTitle', { number: reqNum })
      : this.languageService.translate('form.createTitle');
  });

  readonly statusNotice = computed(() => {
    const status = this.currentStatus();
    switch (status) {
      case 'Draft':
        return this.languageService.translate('form.statusNoticeDraft');
      case 'Submitted':
        return this.languageService.translate('form.statusNoticeSubmitted');
      case 'Approved':
        return this.languageService.translate('form.statusNoticeApproved');
      case 'Rejected':
      case 'Delivered':
        return this.languageService.translate('form.statusNoticeReadOnly', { status });
      default:
        return '';
    }
  });

  readonly itemOptions = computed(() =>
    EQUIPMENT_ITEMS.map((item) => ({
      label: this.languageService.translate(`items.${item}`),
      value: item
    }))
  );

  readonly selectedDepartmentName = signal<string>('-');
  readonly filteredEmployees = signal<Employee[]>([]);
  readonly selectedEmployee = signal<Employee | null>(null);
  readonly isSearchingEmployees = signal<boolean>(false);

  readonly requestForm = this.fb.group({
    requestNumber: ['', [Validators.required, Validators.pattern(/^EQ-\d+$/)]],
    employeeId: ['', [Validators.required]],
    item: ['Laptop' as EquipmentItem, [Validators.required]],
    quantity: [1, [Validators.required, quantityValidator]],
    estimatedCost: [0, [Validators.required, costValidator]],
    neededOn: [getTodayString(), [Validators.required, neededOnValidator]],
    reason: ['', [Validators.maxLength(250)]]
  });

  onSearchEmployees(event: AutoCompleteCompleteEvent): void {
    const query = event.query?.trim() || '';
    if (!query) {
      this.filteredEmployees.set([]);
      return;
    }

    this.isSearchingEmployees.set(true);
    this.employeeService.searchEmployees(query).subscribe({
      next: (results) => {
        this.filteredEmployees.set(results);
        this.isSearchingEmployees.set(false);
      },
      error: () => {
        this.filteredEmployees.set([]);
        this.isSearchingEmployees.set(false);
      }
    });
  }

  onEmployeeSelect(employee: Employee): void {
    if (!employee) return;
    this.selectedEmployee.set(employee);
    this.requestForm.controls.employeeId.setValue(employee.id);
    this.selectedDepartmentName.set(
      this.departmentService.getDepartmentName(employee.departmentId)
    );
  }

  onEmployeeClear(): void {
    this.selectedEmployee.set(null);
    this.requestForm.controls.employeeId.setValue('');
    this.selectedDepartmentName.set('-');
    this.filteredEmployees.set([]);
  }

  constructor() {
    effect(
      () => {
        const isVisible = this.visible();
        const req = this.request();

        if (isVisible) {
          if (req) {
            this.initEdit(req);
          } else {
            this.initCreate();
          }
        } else {
          this.resetInternalState();
        }
      },
      { allowSignalWrites: true }
    );
  }

  private initCreate(): void {
    this.editingId.set(null);
    this.currentStatus.set('Draft');
    this.selectedEmployee.set(null);
    this.filteredEmployees.set([]);
    this.selectedDepartmentName.set('-');

    forkJoin({
      suggestedNumber: this.requestService.generateNextRequestNumber(),
      departments:
        this.departmentService.departments().length > 0
          ? of(this.departmentService.departments())
          : this.departmentService.loadDepartments()
    }).subscribe({
      next: (res) => {
        this.requestForm.reset({
          requestNumber: res.suggestedNumber,
          employeeId: '',
          item: 'Laptop',
          quantity: 1,
          estimatedCost: 0,
          neededOn: getTodayString(),
          reason: ''
        });
        this.applyFieldPermissions('Draft');
      },
      error: () => {
        this.requestForm.reset({
          requestNumber: 'EQ-1001',
          employeeId: '',
          item: 'Laptop',
          quantity: 1,
          estimatedCost: 0,
          neededOn: getTodayString(),
          reason: ''
        });
        this.applyFieldPermissions('Draft');
      }
    });
  }

  private initEdit(req: EquipmentRequest): void {
    this.editingId.set(req.id);
    this.currentStatus.set(req.status);
    this.filteredEmployees.set([]);

    const loadDeps$ =
      this.departmentService.departments().length > 0
        ? of(this.departmentService.departments())
        : this.departmentService.loadDepartments();

    loadDeps$.subscribe();

    this.requestForm.reset({
      requestNumber: req.requestNumber,
      employeeId: req.employeeId,
      item: req.item,
      quantity: req.quantity,
      estimatedCost: req.estimatedCost,
      neededOn: req.neededOn,
      reason: req.reason ?? ''
    });

    if (req.employeeId) {
      this.employeeService.getEmployee(req.employeeId).subscribe({
        next: (emp) => {
          this.selectedEmployee.set(emp);
          this.selectedDepartmentName.set(
            this.departmentService.getDepartmentName(emp.departmentId)
          );
        },
        error: () => {
          this.selectedEmployee.set(null);
          this.selectedDepartmentName.set('-');
        }
      });
    } else {
      this.selectedEmployee.set(null);
      this.selectedDepartmentName.set('-');
    }

    this.applyFieldPermissions(req.status);
  }

  private resetInternalState(): void {
    this.isSaving.set(false);
    this.editingId.set(null);
    this.selectedEmployee.set(null);
    this.filteredEmployees.set([]);
    this.selectedDepartmentName.set('-');
    this.requestForm.reset();
  }

  private applyFieldPermissions(status: EquipmentStatus): void {
    const controls = this.requestForm.controls;
    Object.values(controls).forEach((ctrl) => ctrl.enable());

    switch (status) {
      case 'Draft':
        break;

      case 'Submitted':
        controls.requestNumber.disable();
        controls.employeeId.disable();
        controls.item.disable();
        controls.estimatedCost.disable();
        break;

      case 'Approved':
        controls.requestNumber.disable();
        controls.employeeId.disable();
        controls.item.disable();
        controls.quantity.disable();
        controls.estimatedCost.disable();
        controls.reason.disable();
        break;

      case 'Rejected':
      case 'Delivered':
        Object.values(controls).forEach((ctrl) => ctrl.disable());
        break;
    }
  }

  onCancel(): void {
    if (this.isSaving()) {
      return;
    }
    this.visible.set(false);
    this.cancelled.emit();
  }

  onVisibleChange(value: boolean): void {
    if (!value) {
      this.onCancel();
    } else {
      this.visible.set(true);
    }
  }

  saveDraft(): void {
    this.processSave('Draft');
  }

  submitRequest(): void {
    this.processSave('Submitted');
  }

  processSave(targetStatus: EquipmentStatus): void {
    if (this.isSaving()) {
      return;
    }

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const raw = this.requestForm.getRawValue();
    this.isSaving.set(true);
    this.targetStatus.set(targetStatus);

    const editId = this.editingId();

    this.requestService.isRequestNumberUnique(raw.requestNumber, editId ?? undefined).subscribe({
      next: (isUnique) => {
        if (!isUnique) {
          this.isSaving.set(false);
          this.requestForm.controls.requestNumber.setErrors({
            requestNumberUnique: true
          });
          this.requestForm.controls.requestNumber.markAsTouched();
          return;
        }

        const payload: Omit<EquipmentRequest, 'id' | 'createdAt'> = {
          requestNumber: raw.requestNumber.trim(),
          employeeId: raw.employeeId,
          item: raw.item,
          quantity: Number(raw.quantity),
          estimatedCost: Number(raw.estimatedCost),
          neededOn: raw.neededOn,
          reason: raw.reason.trim(),
          status: targetStatus
        };

        const save$ = editId
          ? this.requestService.update(editId, payload)
          : this.requestService.create(payload);

        save$.subscribe({
          next: (saved) => {
            this.isSaving.set(false);
            const messageKey =
              targetStatus === 'Submitted'
                ? 'messages.submittedSuccess'
                : targetStatus === 'Delivered'
                  ? 'messages.deliveredSuccess'
                  : 'messages.savedSuccess';
            this.notificationService.success(
              this.languageService.translate(messageKey)
            );
            this.visible.set(false);
            this.saved.emit(saved);
          },
          error: () => {
            this.isSaving.set(false);
            this.notificationService.error(
              'Save Failed',
              'An error occurred while saving the request. The form remains open for corrections.'
            );
          }
        });
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error('Error', 'Unable to validate request number uniqueness.');
      }
    });
  }

  markAsDelivered(): void {
    const editId = this.editingId();
    if (!editId) {
      return;
    }

    const reqNumber = this.requestForm.controls.requestNumber.value;
    this.confirmationService.confirm({
      header: this.languageService.translate('dialog.deliverTitle'),
      message: this.languageService.translate('dialog.deliverMessage', {
        number: reqNumber
      }),
      icon: 'pi pi-check-circle',
      acceptButtonProps: {
        label: this.languageService.translate('dialog.confirm'),
        severity: 'success'
      },
      rejectButtonProps: {
        label: this.languageService.translate('dialog.cancel'),
        severity: 'secondary'
      },
      accept: () => {
        this.processSave('Delivered');
      }
    });
  }
}
