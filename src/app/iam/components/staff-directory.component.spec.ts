/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffDirectoryComponent } from './staff-directory.component';

describe('StaffDirectoryComponent', () => {
  async function render(list: ReturnType<typeof vi.fn>, read = vi.fn()) {
    await TestBed.configureTestingModule({
      imports: [StaffDirectoryComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { list, read } }],
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

  it.each([
    ['forbidden', 'No tienes permiso'],
    ['session-expired', 'La sesión terminó'],
    ['unavailable', 'No se pudo cargar'],
  ])('shows the %s state without staff data', async (kind, message) => {
    const { host } = await render(vi.fn().mockResolvedValue({ kind }));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(host.querySelector('ul')).toBeNull();
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
    host.querySelector<HTMLButtonElement>('li button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(read).toHaveBeenCalledWith(member.id);
    expect(host.querySelector('section[aria-label="Detalle de personal"]')?.textContent)
      .toContain('Deshabilitado');
    expect(host.querySelector('ul')).toBeNull();
    host.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('ul')).not.toBeNull();
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
    host.querySelector<HTMLButtonElement>('li button')?.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('button')?.click();
    resolveRead({ kind: 'loaded', staff: member });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('section[aria-label="Detalle de personal"]')).toBeNull();
  });

  it('opens the separate creation form and returns to the list', async () => {
    const page = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const { fixture, host } = await render(list);
    host.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('dlc-staff-create form')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('dlc-staff-create button[type="button"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('dlc-staff-create')).toBeNull();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
