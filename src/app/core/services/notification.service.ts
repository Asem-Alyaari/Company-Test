import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly messageService = inject(MessageService);

  success(summary: string, detail?: string, life = 4000): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail,
      life
    });
  }

  error(summary: string, detail?: string, life = 5000): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      life
    });
  }

  warn(summary: string, detail?: string, life = 4500): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail,
      life
    });
  }

  info(summary: string, detail?: string, life = 3500): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail,
      life
    });
  }

  clear(key?: string): void {
    this.messageService.clear(key);
  }
}
