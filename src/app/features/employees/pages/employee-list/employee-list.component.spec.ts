import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LanguageService, NotificationService } from '@core';
import { EmployeeListComponent } from './employee-list.component';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../../departments/services/department.service';
import { Employee } from '../../models/employee.model';

describe('EmployeeListComponent', () => {
  let fixture: ComponentFixture<EmployeeListComponent>;
  let component: EmployeeListComponent;
  let languageService: LanguageService;
  let confirmationService: ConfirmationService;

  const mockEmployees: Employee[] = [
    {
      id: '1',
      name: 'Ahmed Mansour',
      email: 'ahmed.mansour@company.com',
      departmentId: '1',
      jobTitle: 'Payroll Specialist',
      phone: '+966501234567'
    },
    {
      id: '2',
      name: 'Fatima Al-Zahrani',
      email: 'fatima.zahrani@company.com',
      departmentId: '2',
      jobTitle: 'HR Officer',
      phone: '+966502345678'
    },
    {
      id: '3',
      name: 'Khalid Al-Ghamdi',
      email: 'khalid.ghamdi@company.com',
      departmentId: '4',
      jobTitle: 'Systems Engineer',
      phone: '+966504567890'
    }
  ];

  const mockDepartments = [
    { id: '1', code: 'PAY', name: 'Payroll' },
    { id: '2', code: 'HR', name: 'HR' },
    { id: '4', code: 'IT', name: 'IT' }
  ];

  const employeesSignal = signal<Employee[]>(mockEmployees);

  const mockEmployeeService = {
    employees: employeesSignal,
    loadEmployees: () => of(mockEmployees),
    createEmployee: (payload: any) => {
      const created = { id: '99', ...payload };
      employeesSignal.update((list) => [...list, created]);
      return of(created);
    },
    updateEmployee: (id: string, payload: any) => {
      const updated = { ...mockEmployees[0], ...payload, id };
      employeesSignal.update((list) => list.map((e) => (e.id === id ? updated : e)));
      return of(updated);
    },
    deleteEmployee: (id: string) => {
      employeesSignal.update((list) => list.filter((e) => e.id !== id));
      return of(void 0);
    },
    getEmployeeById: (id: string) => mockEmployees.find((e) => e.id === id),
    getEmployeeName: (id: string) => mockEmployees.find((e) => e.id === id)?.name ?? '-'
  };

  const mockDepartmentService = {
    departments: signal(mockDepartments),
    loadDepartments: () => of(mockDepartments),
    getDepartmentName: (id: string) => mockDepartments.find((d) => d.id === id)?.name ?? '-'
  };

  beforeEach(async () => {
    employeesSignal.set([...mockEmployees]);

    await TestBed.configureTestingModule({
      imports: [EmployeeListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNoopAnimations(),
        MessageService,
        NotificationService,
        ConfirmationService,
        LanguageService,
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: DepartmentService, useValue: mockDepartmentService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeListComponent);
    component = fixture.componentInstance;
    languageService = TestBed.inject(LanguageService);
    confirmationService = TestBed.inject(ConfirmationService);
    languageService.setLanguage('en');
    fixture.detectChanges();
  });

  it('should initialize and display all loaded employees', () => {
    expect(component).toBeTruthy();
    expect(component.filteredEmployees().length).toBe(3);
    expect(component.totalEmployeesCount()).toBe(3);
  });

  it('should filter employees by search query (name, email, job title)', () => {
    component.searchQuery.set('ahmed');
    expect(component.filteredEmployees().length).toBe(1);
    expect(component.filteredEmployees()[0].name).toBe('Ahmed Mansour');

    component.searchQuery.set('company.com');
    expect(component.filteredEmployees().length).toBe(3);

    component.searchQuery.set('systems');
    expect(component.filteredEmployees().length).toBe(1);
    expect(component.filteredEmployees()[0].name).toBe('Khalid Al-Ghamdi');

    component.searchQuery.set('non-existent');
    expect(component.filteredEmployees().length).toBe(0);
  });

  it('should filter employees by department selection', () => {
    component.selectedDepartment.set('2');
    expect(component.filteredEmployees().length).toBe(1);
    expect(component.filteredEmployees()[0].name).toBe('Fatima Al-Zahrani');

    component.selectedDepartment.set('');
    expect(component.filteredEmployees().length).toBe(3);
  });

  it('should open create dialog with clean default values', () => {
    component.openCreateDialog();
    expect(component.isDialogVisible()).toBe(true);
    expect(component.editingEmployee()).toBeNull();
    expect(component.employeeForm.controls.name.value).toBe('');
    expect(component.employeeForm.controls.email.value).toBe('');
    expect(component.employeeForm.controls.departmentId.value).toBe('1');
  });

  it('should open edit dialog and populate fields accurately', () => {
    const target = mockEmployees[1];
    component.openEditDialog(target);

    expect(component.isDialogVisible()).toBe(true);
    expect(component.editingEmployee()?.id).toBe(target.id);
    expect(component.employeeForm.controls.name.value).toBe(target.name);
    expect(component.employeeForm.controls.email.value).toBe(target.email);
    expect(component.employeeForm.controls.jobTitle.value).toBe(target.jobTitle);
  });

  it('should enforce unique email validation', () => {
    component.openCreateDialog();
    const emailControl = component.employeeForm.controls.email;

    // Duplicate email
    emailControl.setValue('ahmed.mansour@company.com');
    expect(emailControl.hasError('uniqueEmail')).toBe(true);

    // Unique email
    emailControl.setValue('new.employee@company.com');
    expect(emailControl.hasError('uniqueEmail')).toBe(false);

    // Editing self with same email should be valid
    component.openEditDialog(mockEmployees[0]);
    emailControl.setValue('ahmed.mansour@company.com');
    expect(emailControl.hasError('uniqueEmail')).toBe(false);
  });

  it('should submit valid new employee form and close dialog', () => {
    component.openCreateDialog();
    component.employeeForm.setValue({
      name: 'Noura Salem',
      email: 'noura.salem@company.com',
      departmentId: '1',
      jobTitle: 'Accountant',
      phone: '+966509999999'
    });

    component.onSave();
    expect(component.isDialogVisible()).toBe(false);
    expect(component.employeeService.employees().length).toBe(4);
  });

  it('should request confirmation and delete employee upon acceptance', () => {
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      if (options.accept) {
        options.accept();
      }
      return confirmationService;
    });

    const target = mockEmployees[0];
    component.deleteEmployee(target);

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(component.employeeService.employees().some((e) => e.id === target.id)).toBe(false);
  });
});
