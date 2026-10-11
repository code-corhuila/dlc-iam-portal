/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffUnlockComponent } from './staff-unlock.component';

describe('StaffUnlockComponent', () => {
  const member = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7', name: 'Ana',
    email: 'ana@example.test', roles: ['DENTIST'] as const, status: 'LOCKED' as const, version: 3,
  };

  async function render(unlock: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [StaffUnlockComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { unlock } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffUnlockComponent);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !reason) throw new Error('Unlock form is missing');
    reason.value = 'Identidad confirmada';
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, reason, submit };
  }

  it('sends one versioned unlock while saving and emits the Auth record', async () => {
    let resolve!: (value: unknown) => void;
    const unlock = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { fixture, host, submit } = await render(unlock);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    submit();
    submit();
    fixture.detectChanges();
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(unlock).toHaveBeenCalledWith(member, 'Identidad confirmada', expect.any(String));
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    const active = { ...member, status: 'ACTIVE', version: 4 };
    resolve({ kind: 'unlocked', staff: active });
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(active);
  });

  it('reuses an unchanged retry key and replaces it after a conflict refresh', async () => {
    const unlock = vi.fn().mockResolvedValueOnce({ kind: 'unavailable' })
      .mockResolvedValueOnce({ kind: 'conflict' }).mockResolvedValueOnce({ kind: 'unavailable' });
    const { fixture, host, submit } = await render(unlock);
    submit();
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(unlock.mock.calls[1][2]).toBe(unlock.mock.calls[0][2]);
    submit();
    expect(unlock).toHaveBeenCalledTimes(2);
    const refresh = vi.fn();
    fixture.componentInstance.refresh.subscribe(refresh);
    [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Recargar registro'))?.click();
    expect(refresh).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('member', { ...member, version: 4 });
    fixture.detectChanges();
    submit();
    await fixture.whenStable();
    expect(unlock.mock.calls[2][0].version).toBe(4);
    expect(unlock.mock.calls[2][2]).not.toBe(unlock.mock.calls[1][2]);
  });

  it.each(['forbidden', 'session-expired', 'not-found'] as const)(
    'blocks another request after %s', async (kind) => {
      const unlock = vi.fn().mockResolvedValue({ kind });
      const { fixture, host, reason, submit } = await render(unlock);
      submit();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
      expect(reason.disabled).toBe(true);
      submit();
      expect(unlock).toHaveBeenCalledTimes(1);
    },
  );
});
