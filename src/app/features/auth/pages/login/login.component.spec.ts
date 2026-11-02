import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { LoginComponent } from './login.component';
import { AuthService, LanguageService, NotificationService } from '@core';

describe('LoginComponent i18n & Functional Tests', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let languageService: LanguageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNoopAnimations(),
        MessageService,
        NotificationService,
        LanguageService,
        AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    languageService = TestBed.inject(LanguageService);
    languageService.setLanguage('en');
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display English labels when language is en', () => {
    languageService.setLanguage('en');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Enterprise Portal Authentication');
    expect(element.textContent).toContain('Email Address');
    expect(element.textContent).toContain('Password');
    expect(element.textContent).toContain('Sign In');
  });

  it('should reactively switch to authentic Arabic text when language is set to ar', () => {
    languageService.setLanguage('ar');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('تسجيل الدخول إلى البوابة المؤسسية');
    expect(element.textContent).toContain('البريد الإلكتروني');
    expect(element.textContent).toContain('كلمة المرور');
    expect(element.textContent).toContain('تسجيل الدخول');
    expect(element.textContent).toContain('تعبئة بيانات الحساب التجريبي');
  });

  it('should fill demo credentials when fillDemoCredentials is click/called', () => {
    component.fillDemoCredentials();
    expect(component.loginForm.value.email).toBe('admin@company.com');
    expect(component.loginForm.value.password).toBe('Password123');
    expect(component.loginForm.valid).toBe(true);
  });
});
