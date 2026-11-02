import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { AuthService, LanguageService, TranslatePipe } from '@core';
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
export class AppComponent {
  protected readonly languageService = inject(LanguageService);
  protected readonly authService = inject(AuthService);
  protected readonly layoutService = inject(LayoutService);

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  logout(): void {
    this.authService.logout();
  }
}
