export type { Department } from '../../departments/models/department.model';

export type EquipmentItem = 'Laptop' | 'Monitor' | 'Mobile' | 'Headset';
export type EquipmentStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Delivered';

export const EQUIPMENT_ITEMS: readonly EquipmentItem[] = ['Laptop', 'Monitor', 'Mobile', 'Headset'] as const;
export const EQUIPMENT_STATUSES: readonly EquipmentStatus[] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Delivered'] as const;

export interface EquipmentRequest {
  id: string;
  requestNumber: string;
  employeeId?: string;
  employeeName: string;
  departmentId: string;
  item: EquipmentItem;
  quantity: number;
  estimatedCost: number;
  neededOn: string;
  status: EquipmentStatus;
  reason: string;
  createdAt: string;
}

export interface EquipmentRequestFormData {
  requestNumber: string;
  employeeId?: string;
  employeeName: string;
  departmentId: string;
  item: EquipmentItem;
  quantity: number;
  estimatedCost: number;
  neededOn: string;
  reason: string;
}
