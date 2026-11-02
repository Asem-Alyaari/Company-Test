import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private static readonly STORAGE_KEY = 'app-theme';

  private readonly themeModeSignal = signal<ThemeMode>('light');
  readonly themeMode = this.themeModeSignal.asReadonly();

  initializeTheme(): void {
    const saved = localStorage.getItem(ThemeService.STORAGE_KEY) as ThemeMode;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const mode: ThemeMode =
      saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light';
    this.applyTheme(mode);
  }

  toggleTheme(): void {
    const newMode: ThemeMode = this.themeModeSignal() === 'light' ? 'dark' : 'light';
    this.applyTheme(newMode);
  }

  isDarkMode(): boolean {
    return this.themeModeSignal() === 'dark';
  }

  private applyTheme(mode: ThemeMode): void {
    this.themeModeSignal.set(mode);
    const root = document.documentElement;

    if (mode === 'dark') {
      root.classList.add('app-dark');
    } else {
      root.classList.remove('app-dark');
    }

    localStorage.setItem(ThemeService.STORAGE_KEY, mode);
  }
}
