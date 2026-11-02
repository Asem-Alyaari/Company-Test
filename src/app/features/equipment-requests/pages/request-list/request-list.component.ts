import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import {
  AbstractControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TableModule, TablePageEvent } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { EmptyStateComponent, FormErrorComponent, LoaderComponent } from '@shared';
import {
  EQUIPMENT_ITEMS,
  EQUIPMENT_STATUSES,
  EquipmentItem,
  EquipmentRequest,
  EquipmentStatus
} from '../../models/equipment-request.model';
import { EquipmentRequestService } from '../../services/equipment-request.service';
import { DepartmentService } from '../../services/department.service';

interface DropdownOption<T> {
  label: string;
  value: T;
}

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
  selector: 'app-request-list',
  imports: [
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    Tag,
    Button,
    InputText,
    Select,
    Dialog,
    Textarea,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    FormErrorComponent
  ],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestListComponent implements OnInit {
  protected readonly requestService = inject(EquipmentRequestService);
  protected readonly departmentService = inject(DepartmentService);
  protected readonly languageService = inject(LanguageService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly requests = signal<EquipmentRequest[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly selectedDepartment = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly rowsPerPage = signal<number>(5);
  readonly firstRowIndex = signal<number>(0);
  readonly rowsPerPageOptions: number[] = [5, 10, 20, 50];

  // Dialog State
  readonly isDialogVisible = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly targetSavingStatus = signal<EquipmentStatus>('Draft');
  readonly editingRequest = signal<EquipmentRequest | null>(null);
  readonly currentStatus = signal<EquipmentStatus>('Draft');
  readonly minDateString = getTodayString();

  readonly isReadOnly = computed(() => {
    const status = this.currentStatus();
    return status === 'Rejected' || status === 'Delivered';
  });

  readonly dialogTitle = computed(() => {
    const req = this.editingRequest();
    return req
      ? this.languageService.translate('form.editTitle', { number: req.requestNumber })
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

  readonly dialogDepartmentOptions = computed(() =>
    this.departmentService.departments().map((d) => ({
      label: `${d.name} (${d.code})`,
      value: d.id
    }))
  );

  readonly departmentOptions = computed<DropdownOption<string>[]>(() => [
    { label: this.languageService.translate('requests.allDepartments'), value: '' },
    ...this.departmentService.departments().map((d) => ({
      label: d.name,
      value: d.id
    }))
  ]);

  readonly statusOptions = computed<DropdownOption<string>[]>(() => [
    { label: this.languageService.translate('requests.allStatuses'), value: '' },
    ...EQUIPMENT_STATUSES.map((status) => ({
      label: this.languageService.translate(`statuses.${status}`),
      value: status
    }))
  ]);

  readonly pageReportTemplate = computed<string>(() =>
    this.languageService.translate('requests.pageReport')
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

  readonly filteredRequests = computed<EquipmentRequest[]>(() => {
    const all = this.requests();
    const query = this.searchQuery().trim().toLowerCase();
    const deptFilter = this.selectedDepartment();
    const statusFilter = this.selectedStatus();

    return all.filter((req) => {
      const matchesSearch =
        !query ||
        req.requestNumber.toLowerCase().includes(query) ||
        req.employeeName.toLowerCase().includes(query) ||
        req.item.toLowerCase().includes(query);

      const matchesDept = !deptFilter || req.departmentId === deptFilter;
      const matchesStatus = !statusFilter || req.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  });

  readonly visibleCount = computed<number>(() => this.filteredRequests().length);

  ngOnInit(): void {
    this.loadData();

    // Check if navigated via /equipment-requests/new or query parameter
    const shouldOpenCreate =
      this.route.snapshot.data['openCreate'] === true ||
      this.route.snapshot.queryParamMap.get('openCreate') === 'true' ||
      this.router.url.includes('/equipment-requests/new');

    if (shouldOpenCreate) {
      this.openCreateDialog();
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        if (event.urlAfterRedirects.includes('/equipment-requests/new')) {
          if (!this.isDialogVisible()) {
            this.openCreateDialog();
          }
        }
      });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      departments: this.departmentService.loadDepartments(),
      requests: this.requestService.getAll()
    }).subscribe({
      next: (res) => {
        this.requests.set(res.requests);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error loading data';
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  onSearchCommit(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.firstRowIndex.set(0);
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment.set(value ?? '');
    this.firstRowIndex.set(0);
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value ?? '');
    this.firstRowIndex.set(0);
  }

  onPageChange(event: TablePageEvent): void {
    this.firstRowIndex.set(event.first);
    if (event.rows && event.rows !== this.rowsPerPage()) {
      this.rowsPerPage.set(event.rows);
    }
  }

  openCreateDialog(): void {
    this.editingRequest.set(null);
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
        this.isDialogVisible.set(true);
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
        this.isDialogVisible.set(true);
      }
    });
  }

  openEditDialog(request: EquipmentRequest, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingRequest.set(request);
    this.currentStatus.set(request.status);
    this.requestForm.reset({
      requestNumber: request.requestNumber,
      employeeName: request.employeeName,
      departmentId: request.departmentId,
      item: request.item,
      quantity: request.quantity,
      estimatedCost: request.estimatedCost,
      neededOn: request.neededOn,
      reason: request.reason ?? ''
    });
    this.applyFieldPermissions(request.status);
    this.isDialogVisible.set(true);
  }

  closeDialog(): void {
    if (this.isSaving()) {
      return;
    }
    this.isDialogVisible.set(false);
    this.editingRequest.set(null);
    this.requestForm.reset();

    if (this.router.url.includes('/new') || this.route.snapshot.queryParamMap.has('openCreate')) {
      void this.router.navigate(['/equipment-requests'], { replaceUrl: true });
    }
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

  isFieldEnabled(fieldName: keyof typeof this.requestForm.controls): boolean {
    return this.requestForm.controls[fieldName].enabled;
  }

  onSave(targetStatus: EquipmentStatus): void {
    if (this.isSaving()) {
      return;
    }

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const raw = this.requestForm.getRawValue();
    this.isSaving.set(true);
    this.targetSavingStatus.set(targetStatus);

    const editingId = this.editingRequest()?.id;

    this.requestService.isRequestNumberUnique(raw.requestNumber, editingId).subscribe({
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

        const save$ = editingId
          ? this.requestService.update(editingId, payload)
          : this.requestService.create(payload);

        save$.subscribe({
          next: () => {
            this.isSaving.set(false);
            this.isDialogVisible.set(false);
            this.editingRequest.set(null);
            const messageKey =
              targetStatus === 'Submitted'
                ? 'messages.submittedSuccess'
                : targetStatus === 'Delivered'
                  ? 'messages.deliveredSuccess'
                  : 'messages.savedSuccess';
            this.notificationService.success(
              this.languageService.translate(messageKey)
            );
            this.loadData();

            if (this.router.url.includes('/new')) {
              void this.router.navigate(['/equipment-requests'], { replaceUrl: true });
            }
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

  deleteDraft(request: EquipmentRequest, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (request.status !== 'Draft') {
      return;
    }

    this.confirmationService.confirm({
      header: this.languageService.translate('dialog.deleteDraftTitle'),
      message: this.languageService.translate('dialog.deleteDraftMessage', {
        number: request.requestNumber
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: this.languageService.translate('dialog.confirm'),
        severity: 'danger'
      },
      rejectButtonProps: {
        label: this.languageService.translate('dialog.cancel'),
        severity: 'secondary'
      },
      accept: () => {
        this.requestService.delete(request.id).subscribe({
          next: () => {
            this.notificationService.success(
              this.languageService.translate('messages.deletedSuccess', {
                number: request.requestNumber
              })
            );
            this.requests.update((list) => list.filter((r) => r.id !== request.id));
          },
          error: () => {
            this.notificationService.error(
              'Delete Failed',
              'Unable to delete the request. Please try again.'
            );
          }
        });
      }
    });
  }

  navigateToDetails(id: string): void {
    void this.router.navigate(['/equipment-requests', id]);
  }

  exportCsv(): void {
    const visibleRows = this.filteredRequests();

    if (visibleRows.length === 0) {
      this.notificationService.warn(
        this.languageService.translate('messages.exportWarningTitle'),
        this.languageService.translate('messages.exportNoRows')
      );
      return;
    }

    const headers = [
      this.languageService.translate('columns.requestNumber'),
      this.languageService.translate('columns.employee'),
      this.languageService.translate('columns.department'),
      this.languageService.translate('columns.item'),
      this.languageService.translate('columns.quantity'),
      this.languageService.translate('columns.estimatedCost'),
      this.languageService.translate('columns.neededOn'),
      this.languageService.translate('columns.status')
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.map((h) => this.escapeCsv(h)).join(','));

    for (const row of visibleRows) {
      const deptName = this.departmentService.getDepartmentName(row.departmentId);
      const itemTranslated = this.languageService.translate(`items.${row.item}`);
      const statusTranslated = this.languageService.translate(`statuses.${row.status}`);
      const formattedCost = Number(row.estimatedCost).toFixed(2);

      const values = [
        row.requestNumber,
        row.employeeName,
        deptName,
        itemTranslated,
        String(row.quantity),
        formattedCost,
        row.neededOn,
        statusTranslated
      ];

      csvRows.push(values.map((v) => this.escapeCsv(v)).join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `equipment-requests-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  getStatusSeverity(status: EquipmentStatus): 'secondary' | 'info' | 'success' | 'danger' {
    switch (status) {
      case 'Draft':
        return 'secondary';
      case 'Submitted':
        return 'info';
      case 'Approved':
      case 'Delivered':
        return 'success';
      case 'Rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
