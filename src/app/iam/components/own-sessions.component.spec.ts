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

  async function render(list: ReturnType<typeof vi.fn>,
    revoke: ReturnType<typeof vi.fn> = vi.fn()) {
    await TestBed.configureTestingModule({
      imports: [OwnSessionsComponent],
      providers: [{ provide: OwnSessionsService, useValue: { list, revoke } }],
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

  it('groups the session summary and marks the current device', async () => {
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const { fixture, host } = await render(list);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('.page-heading h1')?.textContent).toBe('Mis sesiones');
    expect(host.querySelector('[aria-label="Resumen de sesiones"] strong')?.textContent).toBe('1');
    const currentCard = host.querySelector('.session-list > li.session-card--current');
    expect(currentCard?.querySelector('h3')?.textContent).toBe(session.device);
    expect(currentCard?.querySelector('.current')?.textContent).toBe('Sesión actual');
    expect(currentCard?.textContent).toContain('Vence');
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

  it('announces a load failure without putting the retry button inside the alert', async () => {
    const list = vi.fn().mockResolvedValueOnce({ kind: 'unavailable' })
      .mockResolvedValueOnce({ kind: 'loaded', page });
    const { fixture, host } = await render(list);
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = host.querySelector('[role="alert"]');
    const retry = host.querySelector<HTMLButtonElement>('.state-card button');
    expect(alert?.textContent).toContain('No se pudieron cargar tus sesiones.');
    expect(retry?.textContent).toBe('Reintentar');
    expect(alert?.contains(retry ?? null)).toBe(false);

    retry?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(list).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[aria-label="Resumen de sesiones"]')).not.toBeNull();
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

  async function openRevoke(list: ReturnType<typeof vi.fn>, revoke: ReturnType<typeof vi.fn>) {
    const result = await render(list, revoke);
    await result.fixture.whenStable();
    result.fixture.detectChanges();
    result.host.querySelector<HTMLButtonElement>('li button')?.click();
    result.fixture.detectChanges();
    const textarea = result.host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
    const form = result.host.querySelector<HTMLFormElement>('form[aria-label="Revocar sesión"]');
    if (!textarea || !form) throw new Error('Revocation form is missing');
    textarea.value = 'Dispositivo perdido';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return { ...result, textarea, form };
  }

  it('closes the confirmation form without revoking when canceled', async () => {
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const revoke = vi.fn();
    const { fixture, host, form } = await openRevoke(list, revoke);

    form.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
    fixture.detectChanges();
    expect(host.querySelector('form[aria-label="Revocar sesión"]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('submits once while saving and reloads after Auth confirms revocation', async () => {
    let finish!: (result: { kind: 'revoked' }) => void;
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const revoke = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { fixture, host, form } = await openRevoke(list, revoke);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke.mock.calls[0][0]).toBe(session.id);
    expect(revoke.mock.calls[0][1]).toBe('Dispositivo perdido');
    expect(revoke.mock.calls[0][2]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(host.querySelector<HTMLButtonElement>('form button[type="submit"]')?.disabled).toBe(true);
    finish({ kind: 'revoked' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(list).toHaveBeenCalledTimes(2);
      expect(host.textContent).toContain('Se revocó este dispositivo');
    });
  });

  it('reuses the key after an uncertain response and replaces it when the reason changes', async () => {
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const revoke = vi.fn().mockResolvedValue({ kind: 'unavailable' });
    const { fixture, host, form, textarea } = await openRevoke(list, revoke);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('No pudimos confirmar');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(revoke.mock.calls[1][2]).toBe(revoke.mock.calls[0][2]);
    textarea.value = ' Dispositivo perdido ';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(revoke.mock.calls[2][2]).toBe(revoke.mock.calls[0][2]);
    textarea.value = 'Otro motivo';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(revoke.mock.calls[3][1]).toBe('Otro motivo');
    expect(revoke.mock.calls[3][2]).not.toBe(revoke.mock.calls[0][2]);
  });

  it('removes session details when Auth reports an expired browser session', async () => {
    const list = vi.fn().mockResolvedValue({ kind: 'loaded', page });
    const revoke = vi.fn().mockResolvedValue({ kind: 'session-expired' });
    const { fixture, host, form } = await openRevoke(list, revoke);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('La sesión terminó');
    expect(host.textContent).not.toContain('Chrome en Windows');
  });

  it('shows the expired session after revoking the current device', async () => {
    const list = vi.fn().mockResolvedValueOnce({ kind: 'loaded', page })
      .mockResolvedValueOnce({ kind: 'session-expired' });
    const revoke = vi.fn().mockResolvedValue({ kind: 'revoked' });
    const { fixture, host, form } = await openRevoke(list, revoke);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.textContent).toContain('Se revocó este dispositivo');
    expect(host.textContent).toContain('La sesión terminó');
  });
});
