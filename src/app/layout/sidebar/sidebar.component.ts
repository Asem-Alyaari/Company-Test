import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { Button } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { Divider } from 'primeng/divider';
import { AuthService, LanguageService, TranslatePipe } from '@core';
import { LayoutService } from '../layout.service';

export interface NavItem {
  labelKey: string;
  icon: string;
  routerLink: string;
  exact?: boolean;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [Drawer, Button, Avatar, Divider, RouterModule, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly authService = inject(AuthService);
  protected readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  get isOpen(): boolean {
    return this.layoutService.isSidebarVisible();
  }

  set isOpen(value: boolean) {
    this.layoutService.setSidebarVisible(value);
  }

  readonly drawerPosition = computed<'left' | 'right'>(() =>
    this.languageService.currentLang() === 'ar' ? 'right' : 'left'
  );

  readonly navItems = signal<NavItem[]>([
    {
      labelKey: 'nav.equipmentRequests',
      icon: 'pi pi-box',
      routerLink: '/equipment-requests',
      exact: true
    },
    {
      labelKey: 'nav.createRequest',
      icon: 'pi pi-plus-circle',
      routerLink: '/equipment-requests/new'
    }
  ]);

  readonly userInitials = computed(() => {
    const name = this.authService.currentUser()?.name;
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  });

  onNavigate(path: string): void {
    this.layoutService.closeSidebar();
    void this.router.navigateByUrl(path);
  }

  onLogout(): void {
    this.layoutService.closeSidebar();
    this.authService.logout();
  }
}
