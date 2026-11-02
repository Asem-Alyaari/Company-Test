import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RequestFormComponent } from './request-form.component';
import { EquipmentRequestService } from '../../services/equipment-request.service';
import { DepartmentService } from '../../services/department.service';
import { EquipmentRequest } from '../../models/equipment-request.model';

describe('RequestFormComponent - Business Rules', () => {
  let component: RequestFormComponent;
  let fixture: ComponentFixture<RequestFormComponent>;
  let mockRequestService: Partial<EquipmentRequestService>;
  let mockDepartmentService: Partial<DepartmentService>;

  const mockDeliveredRequest: EquipmentRequest = {
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
  };

  beforeEach(async () => {
    mockRequestService = {
      getById: () => of(mockDeliveredRequest),
      generateNextRequestNumber: () => of('EQ-1006'),
      isRequestNumberUnique: () => of(true),
      create: () => of(mockDeliveredRequest),
      update: () => of(mockDeliveredRequest)
    };

    mockDepartmentService = {
      loadDepartments: () => of([{ id: 'payroll', name: 'Payroll' }]),
      departments: signal([{ id: 'payroll', name: 'Payroll' }]),
      getDepartmentName: () => 'Payroll'
    };

    await TestBed.configureTestingModule({
      imports: [RequestFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: EquipmentRequestService, useValue: mockRequestService },
        { provide: DepartmentService, useValue: mockDepartmentService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '5' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Rule 1: Request Number Validation Rule', () => {
    it('should validate that request number strictly starts with EQ- followed by digits', () => {
      const ctrl = component.requestForm.controls.requestNumber;
      ctrl.enable();

      // Valid cases
      ctrl.setValue('EQ-1001');
      expect(ctrl.valid).toBe(true);
      expect(ctrl.hasError('pattern')).toBe(false);

      ctrl.setValue('EQ-99999');
      expect(ctrl.valid).toBe(true);

      // Invalid: missing EQ- prefix
      ctrl.setValue('1001');
      expect(ctrl.hasError('pattern')).toBe(true);

      // Invalid: wrong prefix
      ctrl.setValue('REQ-1001');
      expect(ctrl.hasError('pattern')).toBe(true);

      // Invalid: EQ- followed by letters
      ctrl.setValue('EQ-ABC');
      expect(ctrl.hasError('pattern')).toBe(true);

      // Invalid: empty string
      ctrl.setValue('');
      expect(ctrl.hasError('required')).toBe(true);
    });
  });

  describe('Rule 2: Delivered Request Editing Protection', () => {
    it('should block editing for a Delivered request and disable all form fields', () => {
      // Status is Delivered
      expect(component.currentStatus()).toBe('Delivered');
      expect(component.isReadOnly()).toBe(true);

      // Verify all form controls are disabled
      expect(component.requestForm.controls.requestNumber.disabled).toBe(true);
      expect(component.requestForm.controls.employeeName.disabled).toBe(true);
      expect(component.requestForm.controls.departmentId.disabled).toBe(true);
      expect(component.requestForm.controls.item.disabled).toBe(true);
      expect(component.requestForm.controls.quantity.disabled).toBe(true);
      expect(component.requestForm.controls.estimatedCost.disabled).toBe(true);
      expect(component.requestForm.controls.neededOn.disabled).toBe(true);
      expect(component.requestForm.controls.reason.disabled).toBe(true);

      // Total form status should be disabled
      expect(component.requestForm.disabled).toBe(true);
    });
  });
});
