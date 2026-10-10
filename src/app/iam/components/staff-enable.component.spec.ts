/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffEnableComponent } from './staff-enable.component';

describe('StaffEnableComponent', () => {
  const member = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7', name: 'Ana',
    email: 'ana@example.test', roles: ['DENTIST'] as const, status: 'DISABLED' as const, version: 3,
  };

  async function render(enable: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [StaffEnableComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { enable } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffEnableComponent);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !reason) throw new Error('Enabling form is missing');
    reason.value = 'Reingreso aprobado';
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, submit };
  }

  it('submits once while saving and emits the state returned by Auth', async () => {
    let resolve!: (value: unknown) => void;
    const enable = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { fixture, host, submit } = await render(enable);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    submit();
    submit();
    fixture.detectChanges();
    expect(enable).toHaveBeenCalledTimes(1);
    expect(enable).toHaveBeenCalledWith(member, 'Reingreso aprobado', expect.any(String));
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    const pending = { ...member, status: 'PENDING_VERIFICATION', version: 4 };
    resolve({ kind: 'enabled', staff: pending });
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(pending);
  });

  it('reuses the retry key until a conflict requires a refreshed version', async () => {
    const enable = vi.fn().mockResolvedValueOnce({ kind: 'unavailable' })
      .mockResolvedValueOnce({ kind: 'conflict' }).mockResolvedValueOnce({ kind: 'unavailable' });
    const { fixture, host, submit } = await render(enable);
    submit();
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(enable.mock.calls[1][2]).toBe(enable.mock.calls[0][2]);
    submit();
    expect(enable).toHaveBeenCalledTimes(2);
    const refresh = vi.fn();
    fixture.componentInstance.refresh.subscribe(refresh);
    [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Recargar registro'))?.click();
    expect(refresh).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('member', { ...member, version: 4 });
    fixture.detectChanges();
    submit();
    await fixture.whenStable();
    expect(enable.mock.calls[2][0].version).toBe(4);
    expect(enable.mock.calls[2][2]).not.toBe(enable.mock.calls[1][2]);
  });

  it.each([
    ['invalid', 'motivo válido'], ['forbidden', 'No tienes permiso'],
    ['session-expired', 'La sesión terminó'], ['not-found', 'no está disponible'],
    ['unavailable', 'Puedes reintentar'],
  ])('shows the %s response', async (kind, message) => {
    const { fixture, host, submit } = await render(vi.fn().mockResolvedValue({ kind }));
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message);
  });
});
