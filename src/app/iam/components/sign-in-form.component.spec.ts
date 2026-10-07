/// <reference types="vitest/globals" />
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { IamApiService } from '../data/iam-api.service';
import { SignInFormComponent } from './sign-in-form.component';

describe('SignInFormComponent', () => {
  it.each([
    'Invalid credentials',
    'Account locked',
    'Account unverified',
  ])('shows a generic error for %s', async (serverMessage) => {
    const api = {
      login: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 401,
          error: { error: 'UNAUTHORIZED', message: serverMessage },
        })),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SignInFormComponent],
      providers: [{ provide: IamApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignInFormComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const email = host.querySelector<HTMLInputElement>('input[name="email"]');
    const password = host.querySelector<HTMLInputElement>('input[name="password"]');
    const form = host.querySelector('form');
    if (!email || !password || !form) throw new Error('Sign-in form is missing');

    email.value = 'staff@example.test';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'StrongPass1';
    password.dispatchEvent(new Event('input', { bubbles: true }));

    const challengeReceived = vi.fn();
    fixture.componentInstance.challenge.subscribe(challengeReceived);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.login).toHaveBeenCalledWith({
      email: 'staff@example.test',
      password: 'StrongPass1',
    });
    expect(host.textContent).toContain('No se pudo completar la autenticación.');
    expect(host.textContent).not.toContain(serverMessage);
    expect(challengeReceived).not.toHaveBeenCalled();
  });
    it('emits the MFA challenge after successful login', async () => {
    const challenge = {
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: '2026-10-06T12:05:00Z',
      mfaRequired: true,
    };
    const api = { login: vi.fn().mockReturnValue(of(challenge)) };

    await TestBed.configureTestingModule({
      imports: [SignInFormComponent],
      providers: [{ provide: IamApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignInFormComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const email = host.querySelector<HTMLInputElement>('input[name="email"]');
    const password = host.querySelector<HTMLInputElement>('input[name="password"]');
    const form = host.querySelector('form');
    if (!email || !password || !form) throw new Error('Sign-in form is missing');

    email.value = 'staff@example.test';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'StrongPass1';
    password.dispatchEvent(new Event('input', { bubbles: true }));

    const challengeReceived = vi.fn();
    fixture.componentInstance.challenge.subscribe(challengeReceived);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(api.login).toHaveBeenCalledWith({
      email: 'staff@example.test',
      password: 'StrongPass1',
    });
    expect(challengeReceived).toHaveBeenCalledTimes(1);
    expect(challengeReceived).toHaveBeenCalledWith(challenge);
  });
    it('ignores a second submit while login is pending', async () => {
    const pending = new Subject();
    const api = { login: vi.fn().mockReturnValue(pending.asObservable()) };

    await TestBed.configureTestingModule({
      imports: [SignInFormComponent],
      providers: [{ provide: IamApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignInFormComponent);
    fixture.componentInstance.email = 'staff@example.test';
    fixture.componentInstance.password = 'StrongPass1';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    const button = host.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!form || !button) throw new Error('Sign-in form is missing');

    const submit = () =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    submit();
    submit();
    fixture.detectChanges();

    expect(api.login).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
  });
});
