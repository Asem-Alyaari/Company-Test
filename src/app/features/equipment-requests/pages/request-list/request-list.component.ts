import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TableModule, TablePageEvent } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { EmptyStateComponent, LoaderComponent } from '@shared';
import {
  EQUIPMENT_STATUSES,
  EquipmentRequest,
  EquipmentStatus
} from '../../models/equipment-request.model';
import { EquipmentRequestService } from '../../services/equipment-request.service';
import { DepartmentService } from '../../services/department.service';
import { RequestFormComponent } from '../request-form/request-form.component';

interface DropdownOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-request-list',
  imports: [
    RouterModule,
    FormsModule,
    TableModule,
    Tag,
    Button,
    InputText,
    Select,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    RequestFormComponent
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

  // RequestFormComponent Modal Dialog State
  readonly isFormVisible = signal<boolean>(false);
  readonly selectedRequest = signal<EquipmentRequest | null>(null);

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
    const isNewRoute =
      this.route.snapshot.data['openCreate'] === true ||
      this.route.snapshot.queryParamMap.get('openCreate') === 'true' ||
      this.router.url.includes('/equipment-requests/new');

    if (isNewRoute) {
      this.openCreateDialog();
    } else if (this.route.snapshot.data['openEdit'] === true || this.router.url.includes('/edit')) {
      const editId = this.route.snapshot.paramMap.get('id');
      if (editId) {
        this.requestService.getById(editId).subscribe({
          next: (req) => this.openEditDialog(req)
        });
      }
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        if (event.urlAfterRedirects.includes('/equipment-requests/new')) {
          if (!this.isFormVisible()) {
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
    this.selectedRequest.set(null);
    this.isFormVisible.set(true);
  }

  openEditDialog(request: EquipmentRequest, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedRequest.set(request);
    this.isFormVisible.set(true);
  }

  onFormSaved(_saved: EquipmentRequest): void {
    this.loadData();
    if (this.router.url.includes('/new') || this.router.url.includes('/edit')) {
      void this.router.navigate(['/equipment-requests'], { replaceUrl: true });
    }
  }

  onFormClosed(): void {
    if (this.router.url.includes('/new') || this.router.url.includes('/edit')) {
      void this.router.navigate(['/equipment-requests'], { replaceUrl: true });
    }
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
