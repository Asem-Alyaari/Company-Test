import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiService, LanguageService, NotificationService } from '@core';
import { DepartmentListComponent } from './department-list.component';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';

describe('DepartmentListComponent', () => {
  let fixture: ComponentFixture<DepartmentListComponent>;
  let component: DepartmentListComponent;
  let departmentService: DepartmentService;
  let confirmationService: ConfirmationService;
  let notificationService: NotificationService;

  const mockDepartments: Department[] = [
    { id: '1', code: 'PAY', name: 'Payroll' },
    { id: '2', code: 'HR', name: 'HR' },
    { id: '3', code: 'FIN', name: 'Finance' },
    { id: '4', code: 'IT', name: 'IT' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNoopAnimations(),
        MessageService,
        NotificationService,
        ConfirmationService,
        LanguageService,
        DepartmentService
      ]
    }).compileComponents();

    departmentService = TestBed.inject(DepartmentService);
    confirmationService = TestBed.inject(ConfirmationService);
    notificationService = TestBed.inject(NotificationService);
    const apiService = TestBed.inject(ApiService);

    vi.spyOn(apiService, 'get').mockReturnValue(of(mockDepartments));

    fixture = TestBed.createComponent(DepartmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load departments', () => {
    expect(component).toBeTruthy();
    expect(component.filteredDepartments().length).toBe(4);
  });

  describe('Form Validations (Code & Name)', () => {
    it('should validate that code is required, 2-10 alphanumeric characters, and unique', () => {
      const codeControl = component.departmentForm.controls.code;

      codeControl.setValue('');
      expect(codeControl.valid).toBe(false);
      expect(codeControl.errors?.['required']).toBe(true);

      // Less than 2 chars
      codeControl.setValue('A');
      expect(codeControl.valid).toBe(false);
      expect(codeControl.errors?.['pattern']).toBeDefined();

      // Greater than 10 chars
      codeControl.setValue('TOOLONGDEPT1');
      expect(codeControl.valid).toBe(false);
      expect(codeControl.errors?.['pattern']).toBeDefined();

      // Special characters
      codeControl.setValue('HR-1');
      expect(codeControl.valid).toBe(false);
      expect(codeControl.errors?.['pattern']).toBeDefined();

      // Unique check (PAY already exists)
      codeControl.setValue('PAY');
      expect(codeControl.valid).toBe(false);
      expect(codeControl.errors?.['uniqueCode']).toBe(true);

      // Valid and unique
      codeControl.setValue('LEGAL');
      expect(codeControl.valid).toBe(true);
    });

    it('should validate that name is required, at least 2 characters, and unique', () => {
      const nameControl = component.departmentForm.controls.name;

      nameControl.setValue('');
      expect(nameControl.valid).toBe(false);
      expect(nameControl.errors?.['required']).toBe(true);

      // Less than 2 chars
      nameControl.setValue('A');
      expect(nameControl.valid).toBe(false);
      expect(nameControl.errors?.['minlength']).toBeDefined();

      // Unique check (Payroll already exists)
      nameControl.setValue('Payroll');
      expect(nameControl.valid).toBe(false);
      expect(nameControl.errors?.['uniqueName']).toBe(true);

      // Valid and unique
      nameControl.setValue('Legal');
      expect(nameControl.valid).toBe(true);
    });

    it('should allow keeping current code and name when editing', () => {
      component.openEditDialog(mockDepartments[0]); // Payroll (PAY)
      component.departmentForm.controls.code.setValue('PAY');
      component.departmentForm.controls.name.setValue('Payroll');

      expect(component.departmentForm.controls.code.errors?.['uniqueCode']).toBeUndefined();
      expect(component.departmentForm.controls.name.errors?.['uniqueName']).toBeUndefined();
      expect(component.departmentForm.valid).toBe(true);
    });
  });

  describe('Dialog and Save Behavior', () => {
    it('should close dialog and show toast on successful save', () => {
      const newDept: Department = { id: '5', code: 'MKT', name: 'Marketing' };
      vi.spyOn(departmentService, 'create').mockReturnValue(of(newDept));
      const notifSpy = vi.spyOn(notificationService, 'success');

      component.openAddDialog();
      expect(component.isDialogVisible()).toBe(true);

      component.departmentForm.setValue({ code: 'MKT', name: 'Marketing' });
      component.onSave();

      expect(component.isSaving()).toBe(false);
      expect(component.isDialogVisible()).toBe(false);
      expect(notifSpy).toHaveBeenCalled();
    });

    it('should keep dialog open on save failure and display error toast', () => {
      vi.spyOn(departmentService, 'create').mockReturnValue(
        throwError(() => new Error('Server connection error'))
      );
      const notifErrorSpy = vi.spyOn(notificationService, 'error');

      component.openAddDialog();
      expect(component.isDialogVisible()).toBe(true);

      component.departmentForm.setValue({ code: 'OPS', name: 'Operations' });
      component.onSave();

      expect(component.isSaving()).toBe(false);
      // Dialog remains open on failure
      expect(component.isDialogVisible()).toBe(true);
      expect(notifErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Delete with confirmation', () => {
    it('should prompt confirmation and delete department on accept', () => {
      const confirmSpy = vi.spyOn(confirmationService, 'confirm').mockImplementation((options) => {
        if (options.accept) {
          options.accept();
        }
        return confirmationService;
      });
      const deleteSpy = vi.spyOn(departmentService, 'delete').mockReturnValue(of(void 0));
      const notifSpy = vi.spyOn(notificationService, 'success');

      component.deleteDepartment(mockDepartments[1]); // HR

      expect(confirmSpy).toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledWith('2');
      expect(notifSpy).toHaveBeenCalled();
    });
  });

  describe('Fallback to dash (-) for deleted/unmatched department in requests', () => {
    it('should return dash (-) when getting department name for deleted id', () => {
      expect(departmentService.getDepartmentName('1')).toBe('Payroll');
      expect(departmentService.getDepartmentName('non-existent-id')).toBe('-');
      expect(departmentService.getDepartmentName('')).toBe('-');
    });
  });
});
