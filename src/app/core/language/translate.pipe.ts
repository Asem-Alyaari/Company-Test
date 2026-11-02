import { ChangeDetectorRef, effect, inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      // Actively track current language signal and mark view for check upon changes
      this.languageService.currentLang();
      this.cdr.markForCheck();
    });
  }

  transform(key: string, params?: Record<string, string | number>): string {
    return this.languageService.translate(key, params);
  }
}
