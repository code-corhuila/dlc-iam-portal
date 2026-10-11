/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { PasswordResetService } from '../data/password-reset.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  async function render(reset: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [{ provide: PasswordResetService, useValue: { reset } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    if (!form) throw new Error('Reset form is missing');
    const fill = (name: string, value: string) => {
      const input = host.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) throw new Error(`${name} is missing`);
      input.value = value;
    };
    fill('token', 'proof-123');
    fill('password', 'StrongPass1');
    fill('confirmation', 'StrongPass1');
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, fill, submit };
  }

  it('submits once and clears the form after a successful reset', async () => {
    let resolve!: (value: 'reset') => void;
    const reset = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { fixture, host, submit } = await render(reset);
    submit();
    submit();
    fixture.detectChanges();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith('proof-123', 'StrongPass1');
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    resolve('reset');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('form')).toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toContain('actualizó');
    expect(host.textContent).not.toContain('proof-123');
  });

  it('rejects mismatched passwords without sending the token', async () => {
    const reset = vi.fn();
    const { fixture, host, fill, submit } = await render(reset);
    fill('confirmation', 'AnotherPass1');
    submit();
    fixture.detectChanges();
    expect(reset).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('blocks retry when a lost response leaves the reset outcome uncertain', async () => {
    const reset = vi.fn().mockResolvedValue('unavailable');
    const { fixture, host, submit } = await render(reset);
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('No pudimos confirmar');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('iniciar sesión');
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    submit();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(host.textContent).not.toContain('proof-123');
  });

  it('does not describe a consumed token as a weak password', async () => {
    const reset = vi.fn().mockResolvedValue('rejected');
    const { fixture, host, submit } = await render(reset);
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('No se aceptó');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('iniciar sesión');
    expect(host.querySelector('[role="alert"]')?.textContent).not.toContain('mínimo 8');
  });
});
