import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { Button } from 'primeng/button';
import { AuthService, ThemeService } from '@core';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-navbar',
  imports: [Menubar, Button, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly themeService = inject(ThemeService);

  readonly items = signal<MenuItem[]>([
    {
      label: 'Home',
      icon: 'pi pi-home',
      routerLink: '/'
    }
  ]);

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
