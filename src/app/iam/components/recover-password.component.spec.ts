/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { IamApiService } from '../data/iam-api.service';
import { RecoverPasswordComponent } from './recover-password.component';

describe('RecoverPasswordComponent', () => {
  async function render(requestPasswordRecovery: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [RecoverPasswordComponent],
      providers: [{ provide: IamApiService, useValue: { requestPasswordRecovery } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(RecoverPasswordComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector<HTMLInputElement>('input[name="email"]');
    const form = host.querySelector('form');
    if (!input || !form) throw new Error('Recovery form is missing');
    input.value = ' staff@example.test ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { fixture, host, form };
  }

  it('shows a generic acknowledgement after a successful request', async () => {
    const request = vi.fn().mockReturnValue(of(void 0));
    const { fixture, host, form } = await render(request);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(request).toHaveBeenCalledWith('staff@example.test');
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    expect(host.querySelector('form')).toBeNull();
    expect(host.textContent).not.toContain('staff@example.test');
  });

  it('does not expose a server error', async () => {
    const request = vi.fn().mockReturnValue(
      throwError(() => new Error('Account not found')),
    );
    const { fixture, host, form } = await render(request);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Account not found');
  });

  it('ignores duplicate submissions while the request is pending', async () => {
    const pending = new Subject<void>();
    const request = vi.fn().mockReturnValue(pending.asObservable());
    const { fixture, host, form } = await render(request);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(request).toHaveBeenCalledTimes(1);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled)
      .toBe(true);
  });
});
