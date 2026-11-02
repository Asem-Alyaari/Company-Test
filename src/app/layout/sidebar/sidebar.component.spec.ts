import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { SidebarComponent } from './sidebar.component';
import { AuthService, LanguageService, NotificationService } from '@core';
import { LayoutService } from '../layout.service';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;
  let layoutService: LayoutService;
  let languageService: LanguageService;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNoopAnimations(),
        MessageService,
        NotificationService,
        LanguageService,
        LayoutService,
        AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    layoutService = TestBed.inject(LayoutService);
    languageService = TestBed.inject(LanguageService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the sidebar component and be closed by default', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen).toBe(false);
  });

  it('should only be openable when authenticated', () => {
    // Unauthenticated state: opening layoutService still leaves isOpen false
    layoutService.openSidebar();
    expect(component.isOpen).toBe(false);

    // Authenticated state: opening layoutService makes isOpen true
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    expect(component.isOpen).toBe(true);

    layoutService.closeSidebar();
    expect(component.isOpen).toBe(false);
  });

  it('should set drawer position to right for Arabic and left for English', () => {
    languageService.setLanguage('ar');
    fixture.detectChanges();
    expect(component.drawerPosition()).toBe('right');

    languageService.setLanguage('en');
    fixture.detectChanges();
    expect(component.drawerPosition()).toBe('left');
  });

  it('should include equipment requests and departments routes in navItems', () => {
    const items = component.navItems();
    expect(items.some((i) => i.routerLink === '/equipment-requests')).toBe(true);
    expect(items.some((i) => i.routerLink === '/departments')).toBe(true);
    expect(items.some((i) => i.routerLink === '/equipment-requests/new')).toBe(true);
  });
});
