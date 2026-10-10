/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import { StaffDirectoryService } from './staff-directory.service';

describe('StaffDirectoryService', () => {
  const staff = {
    id: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
    email: 'staff@example.test',
    name: 'Personal de prueba',
    roles: ['DENTIST'],
    status: 'ACTIVE',
    version: 1,
  };
  const page = { data: [staff], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };

  function setup() {
    const controller = new AbortController();
    const request = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: IAM_PORTAL_CONTEXT, useValue: { signal: controller.signal, http: { request } } },
        StaffDirectoryService,
      ],
    });
    return { directory: TestBed.inject(StaffDirectoryService), request, controller };
  }

  it('reads a page through shell HTTP without accepting secret fields', async () => {
    const { directory, request, controller } = setup();
    request.mockResolvedValueOnce({ ok: true, status: 200, data: page });

    expect(await directory.list(1)).toEqual({ kind: 'loaded', page });
    expect(request).toHaveBeenCalledWith({
      method: 'GET', path: '/api/v1/auth/staff',
      query: { page: ['1'], limit: ['20'] }, signal: controller.signal,
    });

    request.mockResolvedValueOnce({
      ok: true, status: 200,
      data: { ...page, data: [{ ...staff, passwordHash: 'must-not-pass' }] },
    });
    expect(await directory.list(1)).toEqual({ kind: 'unavailable' });
  });

  it('returns a forbidden state for an owner 403', async () => {
    const { directory, request } = setup();
    request.mockResolvedValue({ ok: false, status: 403 });
    expect(await directory.list(1)).toEqual({ kind: 'forbidden' });
  });

  it('distinguishes a protected 401 from a service failure', async () => {
    const { directory, request } = setup();
    request.mockResolvedValueOnce({ ok: false, status: 401 });
    request.mockResolvedValueOnce({ ok: false, status: 503 });
    expect(await directory.list(1)).toEqual({ kind: 'session-expired' });
    expect(await directory.list(1)).toEqual({ kind: 'unavailable' });
  });
});
