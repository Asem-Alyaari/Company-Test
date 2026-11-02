import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';
import { ConfirmationService } from 'primeng/api';
import { LanguageService, NotificationService, TranslatePipe } from '@core';
import { LoaderComponent } from '@shared';
import { EquipmentRequest, EquipmentStatus } from '../../models/equipment-request.model';
import { EquipmentRequestService } from '../../services/equipment-request.service';
import { DepartmentService } from '../../services/department.service';

@Component({
  selector: 'app-request-details',
  imports: [
    RouterModule,
    Card,
    Tag,
    Button,
    Divider,
    TranslatePipe,
    LoaderComponent
  ],
  templateUrl: './request-details.component.html',
  styleUrl: './request-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestDetailsComponent implements OnInit {
  protected readonly requestService = inject(EquipmentRequestService);
  protected readonly departmentService = inject(DepartmentService);
  protected readonly languageService = inject(LanguageService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly request = signal<EquipmentRequest | null>(null);
  readonly loading = signal<boolean>(true);
  readonly notFound = signal<boolean>(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    forkJoin({
      departments: this.departmentService.loadDepartments(),
      request: this.requestService.getById(id)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.request.set(res.request);
          this.loading.set(false);
        },
        error: () => {
          // Unknown id -> shows translated Request not found with back button
          this.notFound.set(true);
          this.loading.set(false);
        }
      });
  }

  deleteDraft(): void {
    const req = this.request();
    if (!req || req.status !== 'Draft') return;

    this.confirmationService.confirm({
      header: this.languageService.translate('dialog.deleteDraftTitle'),
      message: this.languageService.translate('dialog.deleteDraftMessage', {
        number: req.requestNumber
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
        this.requestService.delete(req.id).subscribe({
          next: () => {
            this.notificationService.success(
              this.languageService.translate('messages.deletedSuccess', {
                number: req.requestNumber
              })
            );
            void this.router.navigate(['/equipment-requests']);
          },
          error: () => {
            this.notificationService.error(
              'Error',
              'Failed to delete draft request. Please try again.'
            );
          }
        });
      }
    });
  }

  markAsDelivered(): void {
    const req = this.request();
    if (!req || req.status !== 'Approved') return;

    this.confirmationService.confirm({
      header: this.languageService.translate('dialog.deliverTitle'),
      message: this.languageService.translate('dialog.deliverMessage', {
        number: req.requestNumber
      }),
      icon: 'pi pi-check-circle',
      acceptButtonProps: {
        label: this.languageService.translate('dialog.confirm'),
        severity: 'success'
      },
      rejectButtonProps: {
        label: this.languageService.translate('dialog.cancel'),
        severity: 'secondary'
      },
      accept: () => {
        this.requestService.update(req.id, { status: 'Delivered' }).subscribe({
          next: (updated) => {
            this.request.set(updated);
            this.notificationService.success(
              this.languageService.translate('messages.deliveredSuccess')
            );
          },
          error: () => {
            this.notificationService.error(
              'Error',
              'Failed to mark request as delivered.'
            );
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(
        this.languageService.currentLang() === 'ar' ? 'ar-SA' : 'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );
    } catch {
      return dateString;
    }
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
