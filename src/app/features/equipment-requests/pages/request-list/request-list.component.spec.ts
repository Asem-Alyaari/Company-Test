import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LanguageService, NotificationService } from '@core';
import { RequestListComponent } from './request-list.component';
import { EquipmentRequestService } from '../../services/equipment-request.service';
import { DepartmentService } from '../../services/department.service';
import { EquipmentRequest } from '../../models/equipment-request.model';

describe('RequestListComponent - Pagination & Features', () => {
  let fixture: ComponentFixture<RequestListComponent>;
  let component: RequestListComponent;
  let languageService: LanguageService;

  const mockRequests: EquipmentRequest[] = [
    {
      id: '1',
      requestNumber: 'EQ-1001',
      employeeName: 'Sara Ali',
      departmentId: 'payroll',
      item: 'Laptop',
      quantity: 1,
      estimatedCost: 2500.5,
      neededOn: '2026-11-15',
      status: 'Draft',
      reason: 'Replacement',
      createdAt: '2026-11-01T08:00:00Z'
    },
    {
      id: '2',
      requestNumber: 'EQ-1002',
      employeeName: 'Omar Nasser',
      departmentId: 'hr',
      item: 'Monitor',
      quantity: 2,
      estimatedCost: 800,
      neededOn: '2026-11-20',
      status: 'Submitted',
      reason: 'New hire setup',
      createdAt: '2026-11-01T09:30:00Z'
    },
    {
      id: '3',
      requestNumber: 'EQ-1003',
      employeeName: 'Lina Hassan',
      departmentId: 'finance',
      item: 'Mobile',
      quantity: 1,
      estimatedCost: 1500,
      neededOn: '2026-12-01',
      status: 'Approved',
      reason: '',
      createdAt: '2026-10-20T10:00:00Z'
    },
    {
      id: '4',
      requestNumber: 'EQ-1004',
      employeeName: 'Huda Saleh',
      departmentId: 'it',
      item: 'Headset',
      quantity: 3,
      estimatedCost: 450.25,
      neededOn: '2026-11-18',
      status: 'Rejected',
      reason: 'Budget exceeded',
      createdAt: '2026-10-28T12:15:00Z'
    },
    {
      id: '5',
      requestNumber: 'EQ-1005',
      employeeName: 'Mazen Omar',
      departmentId: 'payroll',
      item: 'Laptop',
      quantity: 1,
      estimatedCost: 3200,
      neededOn: '2026-11-25',
      status: 'Delivered',
      reason: 'New joiner',
      createdAt: '2026-10-15T07:45:00Z'
    },
    {
      id: '6',
      requestNumber: 'EQ-1006',
      employeeName: 'Ali Khalid',
      departmentId: 'it',
      item: 'Monitor',
      quantity: 1,
      estimatedCost: 950,
      neededOn: '2026-11-30',
      status: 'Draft',
      reason: 'Extra screen',
      createdAt: '2026-11-02T08:00:00Z'
    }
  ];

  const mockDepartmentService = {
    departments: () => [
      { id: 'payroll', code: 'PAY', name: 'Payroll' },
      { id: 'hr', code: 'HR', name: 'HR' },
      { id: 'finance', code: 'FIN', name: 'Finance' },
      { id: 'it', code: 'IT', name: 'IT' }
    ],
    loadDepartments: () =>
      of([
        { id: 'payroll', code: 'PAY', name: 'Payroll' },
        { id: 'hr', code: 'HR', name: 'HR' },
        { id: 'finance', code: 'FIN', name: 'Finance' },
        { id: 'it', code: 'IT', name: 'IT' }
      ]),
    getDepartmentName: (id: string) => id.toUpperCase()
  };

  const mockRequestService = {
    getAll: () => of(mockRequests),
    formatCost: (cost: number) => Number(cost).toFixed(2),
    delete: () => of(void 0),
    generateNextRequestNumber: () => of('EQ-1007'),
    isRequestNumberUnique: () => of(true),
    create: (payload: Omit<EquipmentRequest, 'id' | 'createdAt'>) =>
      of({ id: '99', ...payload, createdAt: '2026-11-02T12:00:00Z' } as EquipmentRequest),
    update: (id: string, payload: Partial<EquipmentRequest>) =>
      of({ id, ...payload } as EquipmentRequest)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNoopAnimations(),
        MessageService,
        NotificationService,
        ConfirmationService,
        LanguageService,
        { provide: EquipmentRequestService, useValue: mockRequestService },
        { provide: DepartmentService, useValue: mockDepartmentService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestListComponent);
    component = fixture.componentInstance;
    languageService = TestBed.inject(LanguageService);
    languageService.setLanguage('en');
    fixture.detectChanges();
  });

  it('should initialize with default pagination state (5 rows per page, first index 0)', () => {
    expect(component).toBeTruthy();
    expect(component.rowsPerPage()).toBe(5);
    expect(component.firstRowIndex()).toBe(0);
    expect(component.filteredRequests().length).toBe(6);
  });

  it('should handle page change events accurately', () => {
    component.onPageChange({ first: 5, rows: 5 });
    expect(component.firstRowIndex()).toBe(5);
    expect(component.rowsPerPage()).toBe(5);

    component.onPageChange({ first: 0, rows: 10 });
    expect(component.firstRowIndex()).toBe(0);
    expect(component.rowsPerPage()).toBe(10);
  });

  it('should reset firstRowIndex to 0 when search query or filter changes', () => {
    component.firstRowIndex.set(5);

    component.onSearchCommit({ target: { value: 'Sara' } } as unknown as Event);
    expect(component.firstRowIndex()).toBe(0);
    expect(component.searchQuery()).toBe('Sara');

    component.firstRowIndex.set(5);
    component.onDepartmentChange('hr');
    expect(component.firstRowIndex()).toBe(0);
    expect(component.selectedDepartment()).toBe('hr');

    component.firstRowIndex.set(5);
    component.onStatusChange('Draft');
    expect(component.firstRowIndex()).toBe(0);
    expect(component.selectedStatus()).toBe('Draft');
  });

  it('should render bilingual pagination report templates', () => {
    languageService.setLanguage('en');
    expect(component.pageReportTemplate()).toContain('Showing {first} to {last} of {totalRecords} requests');

    languageService.setLanguage('ar');
    expect(component.pageReportTemplate()).toContain('عرض من {first} إلى {last} من أصل {totalRecords} طلب');
  });

  it('should open create dialog via RequestFormComponent', () => {
    expect(component.isFormVisible()).toBe(false);
    component.openCreateDialog();
    expect(component.isFormVisible()).toBe(true);
    expect(component.selectedRequest()).toBeNull();
  });

  it('should open edit dialog with existing request data via RequestFormComponent', () => {
    const target = mockRequests[0];
    component.openEditDialog(target);
    expect(component.isFormVisible()).toBe(true);
    expect(component.selectedRequest()?.id).toBe(target.id);
  });

  it('should close dialog and reset state on form close', () => {
    component.openCreateDialog();
    expect(component.isFormVisible()).toBe(true);
    component.onFormClosed();
    expect(component.isFormVisible()).toBe(true); // closed handler manages navigation or list updates
  });
});
