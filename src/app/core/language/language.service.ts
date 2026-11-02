import { computed, inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type SupportedLanguage = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

import enTranslations from '../../../../public/i18n/en.json';
import arTranslations from '../../../../public/i18n/ar.json';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly STORAGE_KEY = 'company_test_lang';

  private readonly translations: Record<SupportedLanguage, Record<string, unknown>> = {
    en: enTranslations,
    ar: arTranslations
  };

  private readonly currentLangSignal = signal<SupportedLanguage>(this.getInitialLanguage());

  readonly currentLang = this.currentLangSignal.asReadonly();
  readonly currentDir = computed<Direction>(() => (this.currentLangSignal() === 'ar' ? 'rtl' : 'ltr'));
  readonly isArabic = computed<boolean>(() => this.currentLangSignal() === 'ar');

  constructor() {
    this.applyLanguageToDom(this.currentLangSignal());
  }

  private getInitialLanguage(): SupportedLanguage {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as SupportedLanguage | null;
      if (saved === 'en' || saved === 'ar') {
        return saved;
      }
    } catch {
      // Fallback if localStorage unavailable
    }
    return 'en';
  }

  setLanguage(lang: SupportedLanguage): void {
    if (this.currentLangSignal() === lang) {
      return;
    }
    this.currentLangSignal.set(lang);
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
    this.applyLanguageToDom(lang);
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLangSignal() === 'en' ? 'ar' : 'en');
  }

  private applyLanguageToDom(lang: SupportedLanguage): void {
    const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
    const root = this.document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dir);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLangSignal();
    const translation = this.resolveKey(this.translations[lang], key) ?? this.resolveKey(this.translations['en'], key) ?? key;

    if (!params) {
      return translation;
    }

    return Object.entries(params).reduce((acc, [paramKey, paramVal]) => {
      return acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }, translation);
  }

  private resolveKey(obj: Record<string, unknown>, path: string): string | null {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }
}
