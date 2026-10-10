/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffEditComponent } from './staff-edit.component';

describe('StaffEditComponent', () => {
  const member = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7', name: 'Ana',
    email: 'ana@example.test', roles: ['DENTIST'] as const, status: 'ACTIVE' as const, version: 3,
  };

  async function render(updateName: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [StaffEditComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { updateName } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffEditComponent);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    const input = host.querySelector<HTMLInputElement>('input[name="name"]');
    if (!form || !input) throw new Error('Edit form is missing');
    input.value = '  Ana Pérez  ';
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, submit };
  }

  it('sends one versioned edit while saving and emits the updated record', async () => {
    let resolve!: (value: unknown) => void;
    const updateName = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { fixture, host, submit } = await render(updateName);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    submit();
    submit();
    fixture.detectChanges();
    expect(updateName).toHaveBeenCalledTimes(1);
    expect(updateName).toHaveBeenCalledWith(member.id, 'Ana Pérez', 3);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    const updated = { ...member, name: 'Ana Pérez', version: 4 };
    resolve({ kind: 'updated', staff: updated });
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(updated);
  });

  it('keeps a conflict visible and requests a fresh record', async () => {
    const updateName = vi.fn().mockResolvedValue({ kind: 'conflict' });
    const { fixture, host, submit } = await render(updateName);
    const refresh = vi.fn();
    fixture.componentInstance.refresh.subscribe(refresh);
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('cambió');
    submit();
    expect(updateName).toHaveBeenCalledTimes(1);
    host.querySelectorAll<HTMLButtonElement>('button[type="button"]')[1].click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
