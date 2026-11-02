import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.themeMode()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
  });

  it('should initialize with default light theme when localStorage is empty and system prefers light', () => {
    service.initializeTheme();
    expect(service.themeMode()).toBe('light');
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
  });

  it('should restore saved dark theme from localStorage on initialize', () => {
    localStorage.setItem('app-theme', 'dark');
    service.initializeTheme();
    expect(service.themeMode()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });

  it('should toggle theme from light to dark and back', () => {
    service.initializeTheme();
    expect(service.isDarkMode()).toBe(false);

    service.toggleTheme();
    expect(service.themeMode()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(localStorage.getItem('app-theme')).toBe('dark');

    service.toggleTheme();
    expect(service.themeMode()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(localStorage.getItem('app-theme')).toBe('light');
  });
});
