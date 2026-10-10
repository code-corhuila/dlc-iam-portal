/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffRolesComponent } from './staff-roles.component';

describe('StaffRolesComponent', () => {
  const member = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7', name: 'Ana',
    email: 'ana@example.test', roles: ['DENTIST'] as const, status: 'ACTIVE' as const, version: 3,
  };

  async function render(assignRoles: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [StaffRolesComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { assignRoles } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffRolesComponent);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    const extraRole = host.querySelector<HTMLInputElement>('input[value="SECRETARY_ASSISTANT"]');
    if (!form || !reason || !extraRole) throw new Error('Role form is missing');
    reason.value = 'Cambio aprobado';
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, extraRole, submit };
  }

  it('blocks an unchanged selection and submits only once while saving', async () => {
    let resolve!: (value: unknown) => void;
    const assignRoles = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { fixture, host, extraRole, submit } = await render(assignRoles);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    submit();
    expect(assignRoles).not.toHaveBeenCalled();
    extraRole.checked = true;
    submit();
    submit();
    fixture.detectChanges();
    expect(assignRoles).toHaveBeenCalledTimes(1);
    expect(assignRoles).toHaveBeenCalledWith(member,
      ['DENTIST', 'SECRETARY_ASSISTANT'], 'Cambio aprobado');
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    const assigned = { ...member, roles: ['DENTIST', 'SECRETARY_ASSISTANT'], version: 4 };
    resolve({ kind: 'assigned', staff: assigned });
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(assigned);
  });

  it('requires a reload after a version conflict', async () => {
    const assignRoles = vi.fn().mockResolvedValue({ kind: 'conflict' });
    const { fixture, host, extraRole, submit } = await render(assignRoles);
    const refresh = vi.fn();
    fixture.componentInstance.refresh.subscribe(refresh);
    extraRole.checked = true;
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    submit();
    expect(assignRoles).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('cambió');
    [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Recargar registro'))?.click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
