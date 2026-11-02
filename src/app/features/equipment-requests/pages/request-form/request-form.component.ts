import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, switchMap } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { FormErrorComponent, LoaderComponent } from '@shared';
import {
  Department,
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
    RouterModule,
    ReactiveFormsModule,
    InputText,
    Textarea,
    Select,
    Button,
    Card,
    Tag,
    TranslatePipe,
    FormErrorComponent,
    LoaderComponent
  ],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly requestService = inject(EquipmentRequestService);
  protected readonly departmentService = inject(DepartmentService);
  protected readonly languageService = inject(LanguageService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly requestId = signal<string | null>(null);
  readonly currentStatus = signal<EquipmentStatus>('Draft');
  readonly isSaving = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  readonly isAddMode = computed(() => !this.requestId());
  readonly isReadOnly = computed(() => {
    const status = this.currentStatus();
    return status === 'Rejected' || status === 'Delivered';
  });

  readonly minDateString = getTodayString();

  readonly itemOptions = computed(() =>
    EQUIPMENT_ITEMS.map((item) => ({
      label: this.languageService.translate(`items.${item}`),
      value: item
    }))
  );

  readonly departmentOptions = computed(() =>
    this.departmentService.departments().map((d) => ({
      label: d.name,
      value: d.id
    }))
  );

  readonly requestForm = this.fb.group({
    requestNumber: [
      '',
      [Validators.required, Validators.pattern(/^EQ-\d+$/)]
    ],
    employeeName: ['', [Validators.required, Validators.minLength(2)]],
    departmentId: ['', [Validators.required]],
    item: ['Laptop' as EquipmentItem, [Validators.required]],
    quantity: [1, [Validators.required, quantityValidator]],
    estimatedCost: [0, [Validators.required, costValidator]],
    neededOn: [getTodayString(), [Validators.required, neededOnValidator]],
    reason: ['', [Validators.maxLength(250)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.requestId.set(id);

    this.isLoading.set(true);
    this.departmentService
      .loadDepartments()
      .pipe(
        switchMap(() => {
          if (id) {
            return this.requestService.getById(id);
          } else {
            return this.requestService.generateNextRequestNumber().pipe(
              switchMap((suggestedNumber) => of({ suggestedNumber }))
            );
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          if ('suggestedNumber' in result) {
            // Create mode: auto-suggest EQ- plus highest existing number + 1
            this.requestForm.patchValue({
              requestNumber: result.suggestedNumber
            });
            this.currentStatus.set('Draft');
            this.applyFieldPermissions('Draft');
          } else {
            // Edit mode
            const req = result as EquipmentRequest;
            this.currentStatus.set(req.status);
            this.requestForm.patchValue({
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
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          const msg = err instanceof Error ? err.message : 'Error loading request data';
          this.loadError.set(msg);
        }
      });
  }

  private applyFieldPermissions(status: EquipmentStatus): void {
    const controls = this.requestForm.controls;

    // Reset all controls to enabled first
    Object.values(controls).forEach((ctrl) => ctrl.enable());

    switch (status) {
      case 'Draft':
        // All fields enabled
        break;

      case 'Submitted':
        // Only reason, neededOn (date), and quantity can change
        controls.requestNumber.disable();
        controls.employeeName.disable();
        controls.departmentId.disable();
        controls.item.disable();
        controls.estimatedCost.disable();
        break;

      case 'Approved':
        // Only neededOn (date) can change
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
        // Strictly read-only
        Object.values(controls).forEach((ctrl) => ctrl.disable());
        break;
    }
  }

  saveDraft(): void {
    this.processSave('Draft');
  }

  submitRequest(): void {
    this.processSave('Submitted');
  }

  markAsDelivered(): void {
    const id = this.requestId();
    const reqNumber = this.requestForm.getRawValue().requestNumber;
    if (!id) return;

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
        this.isSaving.set(true);
        this.requestService.update(id, { status: 'Delivered' }).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.notificationService.success(
              this.languageService.translate('messages.deliveredSuccess')
            );
            void this.router.navigate(['/equipment-requests', id]);
          },
          error: () => {
            this.isSaving.set(false);
            this.notificationService.error(
              'Error',
              'Failed to mark as delivered. Please try again.'
            );
          }
        });
      }
    });
  }

  processSave(targetStatus: EquipmentStatus): void {
    if (this.isSaving()) {
      return; // Block double save while request in flight
    }

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const raw = this.requestForm.getRawValue();

    this.isSaving.set(true);

    // Check request number uniqueness first
    this.requestService
      .isRequestNumberUnique(raw.requestNumber, this.requestId() ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

          const save$ = this.isAddMode()
            ? this.requestService.create(payload)
            : this.requestService.update(this.requestId()!, payload);

          save$.subscribe({
            next: (saved) => {
              this.isSaving.set(false);
              const messageKey =
                targetStatus === 'Submitted'
                  ? 'messages.submittedSuccess'
                  : 'messages.savedSuccess';
              this.notificationService.success(
                this.languageService.translate(messageKey)
              );
              void this.router.navigate(['/equipment-requests', saved.id]);
            },
            error: () => {
              // Rule: Do not close the form when save fails
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
}
