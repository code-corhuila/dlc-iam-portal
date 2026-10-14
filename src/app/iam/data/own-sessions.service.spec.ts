/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import { OwnSessionsService } from './own-sessions.service';

describe('OwnSessionsService', () => {
  const key = 'b970208b-8145-49ec-967f-2f3703159c3e';
  const session = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
    device: 'Chrome en Windows', current: true, version: 1,
    expiresAt: '2026-10-18T12:00:00Z', lastUserActivityAt: '2026-10-11T12:00:00Z',
  };
  const page = { data: [session], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };

  function setup() {
    const controller = new AbortController();
    const request = vi.fn();
    TestBed.configureTestingModule({ providers: [
      { provide: IAM_PORTAL_CONTEXT, useValue: { signal: controller.signal, http: { request } } },
      OwnSessionsService,
    ] });
    return { service: TestBed.inject(OwnSessionsService), request, controller };
  }

  it('reads only own sessions through shell HTTP and rejects a leaked secret', async () => {
    const { service, request, controller } = setup();
    request.mockResolvedValueOnce({ ok: true, status: 200, data: page });
    expect(await service.list(1)).toEqual({ kind: 'loaded', page });
    expect(request).toHaveBeenCalledWith({
      method: 'GET', path: '/api/v1/auth/sessions',
      query: { page: ['1'], limit: ['20'] }, signal: controller.signal,
    });
    request.mockResolvedValueOnce({ ok: true, status: 200,
      data: { ...page, data: [{ ...session, refreshToken: 'secret' }] } });
    expect(await service.list(1)).toEqual({ kind: 'unavailable' });
  });

  it.each([
    [400, 'invalid'], [401, 'session-expired'], [403, 'forbidden'], [503, 'unavailable'],
  ])('maps Auth %i to %s without exposing its message', async (status, kind) => {
    const { service, request } = setup();
    request.mockResolvedValue({ ok: false, status, message: 'Private detail' });
    expect(await service.list(1)).toEqual({ kind });
  });

  it('rejects malformed pages and does not request an invalid page', async () => {
    const { service, request } = setup();
    expect(await service.list(0)).toEqual({ kind: 'invalid' });
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValueOnce({ ok: true, status: 200,
      data: { ...page, meta: { ...page.meta, page: 2 } } });
    expect(await service.list(1)).toEqual({ kind: 'unavailable' });
  });

  it('ignores a response after the portal mount is aborted', async () => {
    const { service, request, controller } = setup();
    request.mockImplementation(() => { controller.abort(); return Promise.resolve({ ok: true, status: 200, data: page }); });
    expect(await service.list(1)).toEqual({ kind: 'unavailable' });
  });

  it('revokes only the requested session through shell HTTP with a retry key', async () => {
    const { service, request, controller } = setup();
    request.mockResolvedValue({ ok: true, status: 204 });
    expect(await service.revoke(session.id, '  Lost device  ', key)).toEqual({ kind: 'revoked' });
    expect(request).toHaveBeenCalledWith({
      method: 'POST', path: `/api/v1/auth/sessions/${session.id}/revocations`,
      body: { reason: 'Lost device' }, headers: { 'Idempotency-Key': key },
      responseType: 'none', signal: controller.signal,
    });
  });

  it('rejects malformed revocations without contacting Auth', async () => {
    const { service, request } = setup();
    expect(await service.revoke('../other', 'Lost device', key)).toEqual({ kind: 'invalid' });
    expect(await service.revoke(session.id, ' ', key)).toEqual({ kind: 'invalid' });
    expect(await service.revoke(session.id, 'Lost device', 'bad-key')).toEqual({ kind: 'invalid' });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'invalid'], [401, 'session-expired'], [403, 'forbidden'],
    [404, 'not-found'], [409, 'conflict'], [503, 'unavailable'],
  ])('maps revocation HTTP %i to %s', async (status, kind) => {
    const { service, request } = setup();
    request.mockResolvedValue({ ok: false, status, message: 'Private detail' });
    expect(await service.revoke(session.id, 'Lost device', key)).toEqual({ kind });
  });

  it('does not report a lost or unexpected revocation response as success', async () => {
    const { service, request } = setup();
    request.mockRejectedValueOnce(new Error('Connection lost'));
    request.mockResolvedValueOnce({ ok: true, status: 200 });
    expect(await service.revoke(session.id, 'Lost device', key)).toEqual({ kind: 'unavailable' });
    expect(await service.revoke(session.id, 'Lost device', key)).toEqual({ kind: 'unavailable' });
  });
});
