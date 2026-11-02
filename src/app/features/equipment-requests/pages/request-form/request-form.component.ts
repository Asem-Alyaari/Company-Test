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
import { DepartmentService } from '../../services/department.service';

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
    ReactiveFormsModule,
    Dialog,
    InputText,
    Textarea,
    Select,
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

  readonly departmentOptions = computed(() =>
    this.departmentService.departments().map((d) => ({
      label: `${d.name} (${d.code})`,
      value: d.id
    }))
  );

  readonly requestForm = this.fb.group({
    requestNumber: ['', [Validators.required, Validators.pattern(/^EQ-\d+$/)]],
    employeeName: ['', [Validators.required, Validators.minLength(2)]],
    departmentId: ['', [Validators.required]],
    item: ['Laptop' as EquipmentItem, [Validators.required]],
    quantity: [1, [Validators.required, quantityValidator]],
    estimatedCost: [0, [Validators.required, costValidator]],
    neededOn: [getTodayString(), [Validators.required, neededOnValidator]],
    reason: ['', [Validators.maxLength(250)]]
  });

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

    forkJoin({
      suggestedNumber: this.requestService.generateNextRequestNumber(),
      departments:
        this.departmentService.departments().length > 0
          ? of(this.departmentService.departments())
          : this.departmentService.loadDepartments()
    }).subscribe({
      next: (res) => {
        const firstDeptId = res.departments[0]?.id ?? '';
        this.requestForm.reset({
          requestNumber: res.suggestedNumber,
          employeeName: '',
          departmentId: firstDeptId,
          item: 'Laptop',
          quantity: 1,
          estimatedCost: 0,
          neededOn: getTodayString(),
          reason: ''
        });
        this.applyFieldPermissions('Draft');
      },
      error: () => {
        const firstDeptId = this.departmentService.departments()[0]?.id ?? '';
        this.requestForm.reset({
          requestNumber: 'EQ-1001',
          employeeName: '',
          departmentId: firstDeptId,
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

    this.requestForm.reset({
      requestNumber: req.requestNumber,
      employeeName: req.employeeName,
      departmentId: req.departmentId,
      item: req.item,
      quantity: req.quantity,
      estimatedCost: req.estimatedCost,
      neededOn: req.neededOn,
      reason: req.reason ?? ''
    });

    this.applyFieldPermissions(req.status);
  }

  private resetInternalState(): void {
    this.isSaving.set(false);
    this.editingId.set(null);
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
        controls.employeeName.disable();
        controls.departmentId.disable();
        controls.item.disable();
        controls.estimatedCost.disable();
        break;

      case 'Approved':
        controls.requestNumber.disable();
        controls.employeeName.disable();
        controls.departmentId.disable();
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
          employeeName: raw.employeeName.trim(),
          departmentId: raw.departmentId,
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
