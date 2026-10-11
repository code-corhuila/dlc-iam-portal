/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { EmailVerificationService } from '../data/email-verification.service';
import { EmailVerificationComponent } from './email-verification.component';

describe('EmailVerificationComponent', () => {
  async function render(verify: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [EmailVerificationComponent],
      providers: [{ provide: EmailVerificationService, useValue: { verify } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(EmailVerificationComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector<HTMLInputElement>('input[name="token"]');
    const form = host.querySelector('form');
    if (!input || !form) throw new Error('Verification form is missing');
    input.value = ' secret-token ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { fixture, host, form };
  }

  it('submits once while saving and clears the token on success', async () => {
    let finish!: (value: 'verified') => void;
    const verify = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { fixture, host, form } = await render(verify);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    finish('verified');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    expect(host.querySelector('input[name="token"]')).toBeNull();
    expect(fixture.componentInstance.token()).toBe('');
    expect(host.textContent).not.toContain('secret-token');
  });

  it('shows a generic invalid-token message without echoing the token', async () => {
    const verify = vi.fn().mockResolvedValue('invalid');
    const { fixture, host, form } = await render(verify);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('no es válido');
    expect(host.textContent).not.toContain('secret-token');
  });

  it('blocks retry after a rate limit', async () => {
    const verify = vi.fn().mockResolvedValue('rate-limited');
    const { fixture, host, form } = await render(verify);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(verify).toHaveBeenCalledTimes(1);
  });
});
