import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { AuthService, LanguageService, ThemeService, TranslatePipe } from '@core';
import { LayoutService, SidebarComponent } from '@layout';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    Button,
    Toast,
    ConfirmDialog,
    TranslatePipe,
    SidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  protected readonly languageService = inject(LanguageService);
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  protected readonly layoutService = inject(LayoutService);

  ngOnInit(): void {
    this.themeService.initializeTheme();
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.layoutService.closeSidebar();
    this.authService.logout();
  }
}
