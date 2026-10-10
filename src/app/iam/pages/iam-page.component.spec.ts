/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SignInFormComponent } from '../components/sign-in-form.component';
import { IamApiService } from '../data/iam-api.service';
import { IamPageComponent } from './iam-page.component';

describe('IamPageComponent', () => {
  async function renderPage() {
    await TestBed.configureTestingModule({
      imports: [IamPageComponent],
      providers: [{ provide: IamApiService, useValue: { login: vi.fn() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(IamPageComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => vi.useRealTimers());

  it('keeps a valid challenge in memory while MFA is pending', async () => {
    const { fixture, page } = await renderPage();

    expect(page.querySelector('section[aria-label="Acceso del personal"] dlc-sign-in-form'))
      .not.toBeNull();

    const signIn = fixture.debugElement.query(By.directive(SignInFormComponent));
    if (!signIn) throw new Error('Sign-in form is missing');

    const challenge = {
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      mfaRequired: true as const,
    };
    signIn.componentInstance.challenge.emit(challenge);
    fixture.detectChanges();

    expect(fixture.componentInstance.challenge()).toEqual(challenge);
    expect(page.textContent).toContain('Verificación adicional requerida');
    expect(page.textContent).not.toContain(challenge.challengeId);
    expect(page.querySelector('dlc-sign-in-form')).toBeNull();
  });

  it('expires a pending challenge and lets staff return to sign-in', async () => {
    const { fixture, page } = await renderPage();
    vi.useFakeTimers();
    fixture.componentInstance.showMfa({
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
      mfaRequired: true,
    });
    fixture.detectChanges();

    vi.advanceTimersByTime(1_000);
    fixture.detectChanges();

    expect(fixture.componentInstance.challenge()).toBeNull();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('La verificación expiró');
    expect(page.querySelector('dlc-sign-in-form')).toBeNull();

    page.querySelector<HTMLButtonElement>('.mfa-state button')?.click();
    fixture.detectChanges();
    expect(page.querySelector('dlc-sign-in-form')).not.toBeNull();
  });

  it('cancels expiration when staff restarts sign-in', async () => {
    const { fixture, page } = await renderPage();
    vi.useFakeTimers();
    fixture.componentInstance.showMfa({
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
      mfaRequired: true,
    });
    fixture.detectChanges();

    page.querySelector<HTMLButtonElement>('.mfa-state button')?.click();
    vi.advanceTimersByTime(1_000);
    fixture.detectChanges();

    expect(fixture.componentInstance.challenge()).toBeNull();
    expect(fixture.componentInstance.failure()).toBeNull();
    expect(page.querySelector('dlc-sign-in-form')).not.toBeNull();
  });

  it('rejects a malformed challenge instead of opening a pending screen', async () => {
    const { fixture, page } = await renderPage();
    fixture.componentInstance.showMfa({
      challengeId: '',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      mfaRequired: true,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.challenge()).toBeNull();
    expect(page.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudo continuar con la verificación');
    expect(page.textContent).not.toContain('Verificación adicional requerida');
  });

  it('rejects a challenge that has already expired', async () => {
    const { fixture, page } = await renderPage();
    fixture.componentInstance.showMfa({
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      mfaRequired: true,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.challenge()).toBeNull();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('La verificación expiró');
    expect(page.querySelector('dlc-sign-in-form')).toBeNull();
  });
});
