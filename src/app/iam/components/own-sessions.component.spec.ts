/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { OwnSessionsService, type OwnSessionsResult } from '../data/own-sessions.service';
import { OwnSessionsComponent } from './own-sessions.component';

describe('OwnSessionsComponent', () => {
  const session = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
    device: 'Chrome en Windows', current: true, version: 1,
    expiresAt: '2026-10-18T12:00:00Z',
  };
  const page = { data: [session], meta: { page: 1, limit: 20, total: 1, totalPages: 2 } };

  async function render(list: ReturnType<typeof vi.fn>) {
    await TestBed.configureTestingModule({
      imports: [OwnSessionsComponent],
      providers: [{ provide: OwnSessionsService, useValue: { list } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(OwnSessionsComponent);
    fixture.detectChanges();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  it('shows loading, own device, activity and pagination', async () => {
    let finish!: (result: OwnSessionsResult) => void;
    const list = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { fixture, host } = await render(list);
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Cargando');
    finish({ kind: 'loaded', page: { ...page, data: [{ ...session,
      lastUserActivityAt: '2026-10-11T12:00:00Z' }] } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.textContent).toContain('Chrome en Windows');
    expect(host.textContent).toContain('Sesión actual');
    expect(host.textContent).toContain('Última actividad');
    expect(host.querySelector<HTMLButtonElement>('nav button')?.disabled).toBe(true);
    expect(host.querySelectorAll<HTMLButtonElement>('nav button')[1]?.disabled).toBe(false);
  });

  it.each([
    ['forbidden', 'No tienes permiso'],
    ['session-expired', 'La sesión terminó'],
    ['unavailable', 'No se pudieron cargar'],
  ] as const)('shows %s without exposing session data', async (kind, message) => {
    const list = vi.fn().mockResolvedValue({ kind });
    const { fixture, host } = await render(list);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(host.textContent).not.toContain(session.id);
  });

  it('ignores a stale page response after a newer page was requested', async () => {
    const finishes = new Map<number, (result: OwnSessionsResult) => void>();
    const list = vi.fn().mockImplementation((number: number) =>
      new Promise<OwnSessionsResult>((resolve) => { finishes.set(number, resolve); }));
    const { fixture, host } = await render(list);
    void fixture.componentInstance.load(2);
    finishes.get(2)?.({ kind: 'loaded', page: { data: [],
      meta: { page: 2, limit: 20, total: 1, totalPages: 2 } } });
    finishes.get(1)?.({ kind: 'loaded', page });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.textContent).toContain('Página 2 de 2');
    expect(host.textContent).not.toContain('Chrome en Windows');
  });
});
