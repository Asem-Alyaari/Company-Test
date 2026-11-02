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
    fixture.detectChanges();
  });

  it('should create the sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should be visible by default and toggle with layoutService', () => {
    expect(component.isOpen).toBe(true);

    layoutService.closeSidebar();
    expect(component.isOpen).toBe(false);

    layoutService.openSidebar();
    expect(component.isOpen).toBe(true);
  });

  it('should set drawer position to right for Arabic and left for English', () => {
    languageService.setLanguage('ar');
    fixture.detectChanges();
    expect(component.drawerPosition()).toBe('right');

    languageService.setLanguage('en');
    fixture.detectChanges();
    expect(component.drawerPosition()).toBe('left');
  });

  it('should include equipment requests routes in navItems', () => {
    const items = component.navItems();
    expect(items.some((i) => i.routerLink === '/equipment-requests')).toBe(true);
    expect(items.some((i) => i.routerLink === '/equipment-requests/new')).toBe(true);
  });
});
