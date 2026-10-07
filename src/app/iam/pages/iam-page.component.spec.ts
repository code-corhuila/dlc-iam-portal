/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SignInFormComponent } from '../components/sign-in-form.component';
import { IamApiService } from '../data/iam-api.service';
import { IamPageComponent } from './iam-page.component';

describe('IamPageComponent', () => {
  it('shows MFA pending after receiving a login challenge', async () => {
    await TestBed.configureTestingModule({
      imports: [IamPageComponent],
      providers: [{ provide: IamApiService, useValue: { login: vi.fn() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(IamPageComponent);
    fixture.detectChanges();

    const signIn = fixture.debugElement.query(By.directive(SignInFormComponent));
    if (!signIn) throw new Error('Sign-in form is missing');

    signIn.componentInstance.challenge.emit({
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: '2026-10-06T12:05:00Z',
      mfaRequired: true,
    });
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Verificación adicional requerida');
    expect(page.querySelector('dlc-sign-in-form')).toBeNull();
  });
});