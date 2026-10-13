/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffDirectoryComponent } from './staff-directory.component';

describe('StaffDirectoryComponent', () => {
  async function render(list: ReturnType<typeof vi.fn>, read = vi.fn(),
    updateName = vi.fn(), disable = vi.fn(), enable = vi.fn(), assignRoles = vi.fn(),
    unlock = vi.fn()) {
    await TestBed.configureTestingModule({
      imports: [StaffDirectoryComponent],
      providers: [{ provide: StaffDirectoryService,
        useValue: { list, read, updateName, disable, enable, assignRoles, unlock } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffDirectoryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  it('shows an empty result and requests the next page', async () => {
    const list = vi.fn()
      .mockResolvedValueOnce({
        kind: 'loaded', page: { data: [], meta: { page: 1, limit: 20, total: 21, totalPages: 2 } },
      })
      .mockResolvedValueOnce({
        kind: 'loaded', page: { data: [], meta: { page: 2, limit: 20, total: 21, totalPages: 2 } },
      });
    const { fixture, host } = await render(list);
    expect(host.textContent).toContain('No hay personal en esta página.');

    const next = host.querySelectorAll<HTMLButtonElement>('nav button')[1];
    next.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(list).toHaveBeenCalledWith(2);
    expect(host.textContent).toContain('Página 2 de 2');
  });

  it('labels pending and disabled staff clearly', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      email: 'staff@example.test', name: 'Personal de prueba', roles: ['DENTIST'],
      status: 'PENDING_VERIFICATION', version: 1,
    };
    const page = {
      data: [member, { ...member, id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a8', status: 'DISABLED' }],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    };
    const { host } = await render(vi.fn().mockResolvedValue({ kind: 'loaded', page }));
    expect(host.textContent).toContain('Pendiente de verificación');
    expect(host.textContent).toContain('Deshabilitado');
  });

  it('shows page-scoped role metrics and filters the visible directory', async () => {
    const dentist = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7', name: 'Ana Pérez',
      email: 'ana@example.test', roles: ['DENTIST'], status: 'ACTIVE', version: 1,
    };
    const admin = {
      ...dentist, id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a8',
      name: 'Luis Gómez', roles: ['ADMINISTRATOR'],
    };
    const page = {
      data: [dentist, admin], meta: { page: 1, limit: 20, total: 24, totalPages: 2 },
    };
    const { fixture, host } = await render(vi.fn().mockResolvedValue({ kind: 'loaded', page }));
    expect(host.querySelector('h1')?.textContent).toContain('Gestión de usuarios y roles');
    expect([...host.querySelectorAll('.metric-card strong')].map((node) => node.textContent))
      .toEqual(['24', '1', '1']);
    expect(host.textContent).not.toContain('ADMINISTRATOR');
    const filter = host.querySelector<HTMLSelectElement>('#staff-role-filter');
    if (!filter) throw new Error('Role filter is missing');
    filter.value = 'DENTIST';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(host.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(host.querySelector('tbody')?.textContent).toContain('Ana Pérez');
    expect(host.querySelector('tbody')?.textContent).not.toContain('Luis Gómez');
  });

  it.each([
    ['forbidden', 'No tienes permiso'],
    ['session-expired', 'La sesión terminó'],
    ['unavailable', 'No se pudo cargar'],
  ])('shows the %s state without staff data', async (kind, message) => {
    const { host } = await render(vi.fn().mockResolvedValue({ kind }));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(host.querySelector('table')).toBeNull();
  });

  it('ignores an older page response after a newer request', async () => {
    const initial = { data: [], meta: { page: 1, limit: 20, total: 41, totalPages: 3 } };
    let resolveOld!: (value: unknown) => void;
    let resolveNew!: (value: unknown) => void;
    const list = vi.fn()
      .mockResolvedValueOnce({ kind: 'loaded', page: initial })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve; }));
    const { fixture, host } = await render(list);
    const oldRequest = fixture.componentInstance.load(2);
    const newRequest = fixture.componentInstance.load(3);
    resolveNew({ kind: 'loaded', page: { ...initial, meta: { ...initial.meta, page: 3 } } });
    await newRequest;
    resolveOld({ kind: 'loaded', page: { ...initial, meta: { ...initial.meta, page: 2 } } });
    await oldRequest;
    fixture.detectChanges();
    expect(host.textContent).toContain('Página 3 de 3');
  });

  it('loads an owner detail and returns to the current list', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana Pérez', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'DISABLED', version: 2,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    const read = vi.fn().mockResolvedValue({ kind: 'loaded', staff: member });
    const { fixture, host } = await render(vi.fn().mockResolvedValue({ kind: 'loaded', page }), read);
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(read).toHaveBeenCalledWith(member.id);
    expect(host.querySelector('section[aria-label="Detalle de personal"]')?.textContent)
      .toContain('Deshabilitado');
    expect(host.querySelector('table')).toBeNull();
    host.querySelector<HTMLButtonElement>('.back-button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('table')).not.toBeNull();
  });

  it('updates the detail and list after a successful name edit', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'ACTIVE', version: 2,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    const updated = { ...member, name: 'Ana Pérez', version: 3 };
    const updateName = vi.fn().mockResolvedValue({ kind: 'updated', staff: updated });
    const { fixture, host } = await render(
      vi.fn().mockResolvedValue({ kind: 'loaded', page }),
      vi.fn().mockResolvedValue({ kind: 'loaded', staff: member }), updateName,
    );
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('section[aria-label="Detalle de personal"] button')?.click();
    fixture.detectChanges();
    const form = host.querySelector('dlc-staff-edit form');
    const input = form?.querySelector<HTMLInputElement>('input[name="name"]');
    if (!form || !input) throw new Error('Edit form is missing');
    input.value = 'Ana Pérez';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(updateName).toHaveBeenCalledWith(member.id, 'Ana Pérez', 2);
    expect(host.querySelector('h2')?.textContent).toContain('Ana Pérez');
    expect(host.querySelector('dlc-staff-edit')).toBeNull();
    host.querySelector<HTMLButtonElement>('.back-button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('tbody .person strong')?.textContent).toContain('Ana Pérez');
  });

  it('updates the detail and list after Auth disables a staff member', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'ACTIVE', version: 2,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    const disabled = { ...member, status: 'DISABLED', version: 3 };
    const disable = vi.fn().mockResolvedValue({ kind: 'disabled', staff: disabled });
    const { fixture, host } = await render(
      vi.fn().mockResolvedValue({ kind: 'loaded', page }),
      vi.fn().mockResolvedValue({ kind: 'loaded', staff: member }), vi.fn(), disable,
    );
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const disableButton = [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Deshabilitar personal'));
    disableButton?.click();
    fixture.detectChanges();
    const form = host.querySelector('dlc-staff-disable form');
    const reason = form?.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !reason) throw new Error('Disabling form is missing');
    reason.value = 'Baja solicitada';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(disable).toHaveBeenCalledWith(expect.objectContaining({ id: member.id }),
      'Baja solicitada', expect.any(String));
    expect(host.querySelector('dlc-staff-disable')).toBeNull();
    expect(host.querySelector('section[aria-label="Detalle de personal"]')?.textContent)
      .toContain('Deshabilitado');
    expect([...host.querySelectorAll<HTMLButtonElement>('button')]
      .some((button) => button.textContent?.includes('Deshabilitar personal'))).toBe(false);
    host.querySelector<HTMLButtonElement>('.back-button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('tbody tr')?.textContent).toContain('Deshabilitado');
  });

  it('updates the detail and list when Auth enables an unverified member', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'DISABLED', version: 2,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    const pending = { ...member, status: 'PENDING_VERIFICATION', version: 3 };
    const enable = vi.fn().mockResolvedValue({ kind: 'enabled', staff: pending });
    const { fixture, host } = await render(
      vi.fn().mockResolvedValue({ kind: 'loaded', page }),
      vi.fn().mockResolvedValue({ kind: 'loaded', staff: member }), vi.fn(), vi.fn(), enable,
    );
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const enableButton = [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Habilitar personal'));
    enableButton?.click();
    fixture.detectChanges();
    const form = host.querySelector('dlc-staff-enable form');
    const reason = form?.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !reason) throw new Error('Enabling form is missing');
    reason.value = 'Reingreso aprobado';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(enable).toHaveBeenCalledWith(expect.objectContaining({ id: member.id }),
      'Reingreso aprobado', expect.any(String));
    expect(host.querySelector('dlc-staff-enable')).toBeNull();
    expect(host.querySelector('section[aria-label="Detalle de personal"]')?.textContent)
      .toContain('Pendiente de verificación');
    host.querySelector<HTMLButtonElement>('.back-button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('tbody tr')?.textContent).toContain('Pendiente de verificación');
  });

  it('offers unlock only for locked staff and updates the detail after Auth confirms it', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'LOCKED', version: 2,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    const active = { ...member, status: 'ACTIVE', version: 3 };
    const unlock = vi.fn().mockResolvedValue({ kind: 'unlocked', staff: active });
    const { fixture, host } = await render(
      vi.fn().mockResolvedValue({ kind: 'loaded', page }),
      vi.fn().mockResolvedValue({ kind: 'loaded', staff: member }),
      vi.fn(), vi.fn(), vi.fn(), vi.fn(), unlock,
    );
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Desbloquear personal'))?.click();
    fixture.detectChanges();
    const form = host.querySelector('dlc-staff-unlock form');
    const reason = form?.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !reason) throw new Error('Unlock form is missing');
    reason.value = 'Identidad confirmada';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(unlock).toHaveBeenCalledWith(expect.objectContaining({ id: member.id }),
      'Identidad confirmada', expect.any(String));
    expect(host.querySelector('dlc-staff-unlock')).toBeNull();
    expect(host.querySelector('section[aria-label="Detalle de personal"]')?.textContent)
      .toContain('Activo');
    expect([...host.querySelectorAll<HTMLButtonElement>('button')]
      .some((button) => button.textContent?.includes('Desbloquear personal'))).toBe(false);
  });

  it('updates the detail and list after Auth replaces staff roles', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'ACTIVE', version: 2,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    const assigned = { ...member, roles: ['SECRETARY_ASSISTANT'], version: 3 };
    const assignRoles = vi.fn().mockResolvedValue({ kind: 'assigned', staff: assigned });
    const { fixture, host } = await render(
      vi.fn().mockResolvedValue({ kind: 'loaded', page }),
      vi.fn().mockResolvedValue({ kind: 'loaded', staff: member }),
      vi.fn(), vi.fn(), vi.fn(), assignRoles,
    );
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    [...host.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Cambiar roles'))?.click();
    fixture.detectChanges();
    const form = host.querySelector('dlc-staff-roles form');
    const dentist = form?.querySelector<HTMLInputElement>('input[value="DENTIST"]');
    const assistant = form?.querySelector<HTMLInputElement>('input[value="SECRETARY_ASSISTANT"]');
    const reason = form?.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    if (!form || !dentist || !assistant || !reason) throw new Error('Role form is missing');
    dentist.checked = false;
    assistant.checked = true;
    reason.value = 'Cambio aprobado';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(assignRoles).toHaveBeenCalledWith(expect.objectContaining({ id: member.id }),
      ['SECRETARY_ASSISTANT'], 'Cambio aprobado');
    expect(host.querySelector('dlc-staff-roles')).toBeNull();
    expect(host.querySelector('section[aria-label="Detalle de personal"]')?.textContent)
      .toContain('Secretario auxiliar');
    host.querySelector<HTMLButtonElement>('.back-button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('tbody tr')?.textContent).toContain('Secretario auxiliar');
  });

  it('does not show a detail that arrives after returning to the list', async () => {
    const member = {
      id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      name: 'Ana Pérez', email: 'ana@example.test', roles: ['DENTIST'],
      status: 'ACTIVE', version: 1,
    };
    const page = { data: [member], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    let resolveRead!: (value: unknown) => void;
    const read = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveRead = resolve; }));
    const { fixture, host } = await render(vi.fn().mockResolvedValue({ kind: 'loaded', page }), read);
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.back-button')?.click();
    resolveRead({ kind: 'loaded', staff: member });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('section[aria-label="Detalle de personal"]')).toBeNull();
  });

  it('opens the separate creation form and returns to the list', async () => {
    const page = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const { fixture, host } = await render(list);
    host.querySelector<HTMLButtonElement>('.primary-action')?.click();
    fixture.detectChanges();
    expect(host.querySelector('dlc-staff-create form')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('dlc-staff-create button[type="button"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('dlc-staff-create')).toBeNull();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
