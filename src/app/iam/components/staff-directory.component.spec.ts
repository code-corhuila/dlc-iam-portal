/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffDirectoryComponent } from './staff-directory.component';

describe('StaffDirectoryComponent', () => {
  async function render(list: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [StaffDirectoryComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { list } }],
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
    ['unavailable', 'No se pudo cargar'],
  ])('shows the %s state without staff data', async (kind, message) => {
    const { host } = await render(vi.fn().mockResolvedValue({ kind }));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(host.querySelector('ul')).toBeNull();
  });
});
