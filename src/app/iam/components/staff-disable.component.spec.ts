/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffDisableComponent } from './staff-disable.component';

describe('StaffDisableComponent', () => {
  const member = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7', name: 'Ana',
    email: 'ana@example.test', roles: ['DENTIST'] as const, status: 'ACTIVE' as const, version: 3,
  };

  async function render(disable: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [StaffDisableComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { disable } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffDisableComponent);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !reason) throw new Error('Disabling form is missing');
    reason.value = 'Baja solicitada';
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, submit, reason };
  }

  it('sends one request while saving and emits the disabled staff record', async () => {
    let resolve!: (value: unknown) => void;
    const disable = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { fixture, host, submit } = await render(disable);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    submit();
    submit();
    fixture.detectChanges();
    expect(disable).toHaveBeenCalledTimes(1);
    expect(disable.mock.calls[0][0]).toEqual(member);
    expect(disable.mock.calls[0][1]).toBe('Baja solicitada');
    expect(disable.mock.calls[0][2]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    const disabled = { ...member, status: 'DISABLED', version: 4 };
    resolve({ kind: 'disabled', staff: disabled });
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(disabled);
  });

  it('reuses the key on an unchanged retry and blocks a version conflict', async () => {
    const disable = vi.fn().mockResolvedValueOnce({ kind: 'unavailable' })
      .mockResolvedValueOnce({ kind: 'conflict' })
      .mockResolvedValueOnce({ kind: 'unavailable' });
    const { fixture, host, submit } = await render(disable);
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(disable.mock.calls[1][2]).toBe(disable.mock.calls[0][2]);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('cambió');
    expect(host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.disabled).toBe(false);
    submit();
    expect(disable).toHaveBeenCalledTimes(2);
    const refresh = vi.fn();
    fixture.componentInstance.refresh.subscribe(refresh);
    host.querySelectorAll<HTMLButtonElement>('button[type="button"]')[1].click();
    expect(refresh).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('member', { ...member, version: 4 });
    fixture.detectChanges();
    submit();
    await fixture.whenStable();
    expect(disable.mock.calls[2][0].version).toBe(4);
    expect(disable.mock.calls[2][2]).not.toBe(disable.mock.calls[1][2]);
  });

  it.each([
    ['invalid', 'motivo válido'],
    ['forbidden', 'No tienes permiso'],
    ['session-expired', 'La sesión terminó'],
    ['not-found', 'no está disponible'],
    ['unavailable', 'Puedes reintentar'],
  ])('shows the %s response', async (kind, message) => {
    const { fixture, host, submit } = await render(vi.fn().mockResolvedValue({ kind }));
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message);
  });

  it.each(['forbidden', 'session-expired', 'not-found'])(
    'does not retry after a %s response, even if the reason changes', async (kind) => {
      const disable = vi.fn().mockResolvedValue({ kind });
      const { fixture, host, submit, reason } = await render(disable);
      submit();
      await fixture.whenStable();
      fixture.detectChanges();
      const button = host.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(button?.disabled).toBe(true);
      reason.value = 'Otro motivo';
      reason.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      expect(button?.disabled).toBe(true);
      submit();
      expect(disable).toHaveBeenCalledTimes(1);
    },
  );
});
