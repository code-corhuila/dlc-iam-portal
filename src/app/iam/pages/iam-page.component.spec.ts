/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SignInFormComponent } from '../components/sign-in-form.component';
import { IamApiService } from '../data/iam-api.service';
import { IamPageComponent } from './iam-page.component';

describe('IamPageComponent', () => {
  it('shows success only after the shell has completed authentication', async () => {
    await TestBed.configureTestingModule({
      imports: [IamPageComponent],
      providers: [{ provide: IamApiService, useValue: { login: vi.fn() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(IamPageComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('dlc-sign-in-form')).not.toBeNull();
    expect(page.textContent).not.toContain('Ingreso confirmado');

    const signIn = fixture.debugElement.query(By.directive(SignInFormComponent));
    signIn.componentInstance.authenticated.emit();
    fixture.detectChanges();

    expect(page.querySelector('dlc-sign-in-form')).toBeNull();
    expect(page.querySelector('[role="status"]')?.textContent)
      .toContain('Ingreso confirmado');
    expect(page.textContent).not.toContain('Verificación adicional requerida');
  });
});
