import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '@core';
import { EquipmentRequest } from '../models/equipment-request.model';

@Injectable({
  providedIn: 'root'
})
export class EquipmentRequestService {
  private readonly apiService = inject(ApiService);
  private readonly endpoint = 'equipmentRequests';

  getAll(): Observable<EquipmentRequest[]> {
    return this.apiService.get<EquipmentRequest[]>(this.endpoint);
  }

  getById(id: string): Observable<EquipmentRequest> {
    return this.apiService.getById<EquipmentRequest>(this.endpoint, id);
  }

  create(payload: Omit<EquipmentRequest, 'id' | 'createdAt'>): Observable<EquipmentRequest> {
    const newRequest: Omit<EquipmentRequest, 'id'> = {
      ...payload,
      createdAt: new Date().toISOString()
    };
    return this.apiService.post<EquipmentRequest, Omit<EquipmentRequest, 'id'>>(this.endpoint, newRequest);
  }

  update(id: string, payload: Partial<EquipmentRequest>): Observable<EquipmentRequest> {
    return this.apiService.patch<EquipmentRequest, Partial<EquipmentRequest>>(this.endpoint, id, payload);
  }

  delete(id: string): Observable<void> {
    return this.apiService.delete<void>(this.endpoint, id);
  }

  generateNextRequestNumber(): Observable<string> {
    return this.getAll().pipe(
      map((requests) => {
        let maxNumber = 1000;
        const pattern = /^EQ-(\d+)$/;

        for (const req of requests) {
          const match = pattern.exec(req.requestNumber.trim());
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }

        return `EQ-${maxNumber + 1}`;
      })
    );
  }

  isRequestNumberUnique(requestNumber: string, excludeId?: string): Observable<boolean> {
    return this.getAll().pipe(
      map((requests) => {
        const normalized = requestNumber.trim().toUpperCase();
        const existing = requests.find(
          (req) => req.requestNumber.trim().toUpperCase() === normalized && req.id !== excludeId
        );
        return !existing;
      })
    );
  }

  formatCost(cost: number): string {
    return Number(cost).toFixed(2);
  }
}
