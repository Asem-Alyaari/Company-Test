export interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  jobTitle: string;
  phone?: string;
}

export type EmployeeFormData = Omit<Employee, 'id'>;
