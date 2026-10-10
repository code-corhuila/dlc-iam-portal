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

  it('reads a staff detail through shell HTTP and rejects mismatched or private data', async () => {
    const { directory, request, controller } = setup();
    request.mockResolvedValueOnce({ ok: true, status: 200, data: staff });
    expect(await directory.read(staff.id)).toEqual({ kind: 'loaded', staff });
    expect(request).toHaveBeenCalledWith({
      method: 'GET', path: `/api/v1/auth/staff/${staff.id}`, signal: controller.signal,
    });

    request.mockResolvedValueOnce({ ok: true, status: 200, data: { ...staff, passwordHash: 'secret' } });
    expect(await directory.read(staff.id)).toEqual({ kind: 'unavailable' });
    request.mockResolvedValueOnce({ ok: true, status: 200, data: { ...staff, id: '11111111-1111-1111-1111-111111111111' } });
    expect(await directory.read(staff.id)).toEqual({ kind: 'unavailable' });
  });

  it.each([
    [401, 'session-expired'], [403, 'forbidden'], [404, 'not-found'], [503, 'unavailable'],
  ])('maps detail HTTP %i to %s', async (status, kind) => {
    const { directory, request } = setup();
    request.mockResolvedValue({ ok: false, status });
    expect(await directory.read(staff.id)).toEqual({ kind });
  });

  it('does not request a malformed staff identifier', async () => {
    const { directory, request } = setup();
    expect(await directory.read('../sessions')).toEqual({ kind: 'unavailable' });
    expect(request).not.toHaveBeenCalled();
  });

  it('updates only the name with the loaded version through shell HTTP', async () => {
    const { directory, request, controller } = setup();
    const updated = { ...staff, name: 'Ana Pérez', version: 2 };
    request.mockResolvedValue({ ok: true, status: 200, data: updated });
    expect(await directory.updateName(staff.id, '  Ana Pérez  ', 1))
      .toEqual({ kind: 'updated', staff: updated });
    expect(request).toHaveBeenCalledWith({
      method: 'PATCH', path: `/api/v1/auth/staff/${staff.id}`,
      body: { name: 'Ana Pérez', expectedVersion: 1 }, signal: controller.signal,
    });
  });

  it('rejects malformed edit input and a response for another staff member', async () => {
    const { directory, request } = setup();
    expect(await directory.updateName(staff.id, '   ', 1)).toEqual({ kind: 'invalid' });
    expect(await directory.updateName(staff.id, 'Ana', 0)).toEqual({ kind: 'invalid' });
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValue({ ok: true, status: 200,
      data: { ...staff, id: '11111111-1111-1111-1111-111111111111' } });
    expect(await directory.updateName(staff.id, 'Ana', 1)).toEqual({ kind: 'unavailable' });
  });

  it.each([
    [400, 'invalid'], [401, 'session-expired'], [403, 'forbidden'],
    [404, 'not-found'], [409, 'conflict'], [503, 'unavailable'],
  ])('maps update HTTP %i to %s', async (status, kind) => {
    const { directory, request } = setup();
    request.mockResolvedValue({ ok: false, status });
    expect(await directory.updateName(staff.id, 'Ana', 1)).toEqual({ kind });
  });

  const createInput = {
    email: 'new@example.test', name: 'Nuevo personal',
    password: 'StrongPass1', role: 'DENTIST' as const,
  };
  const key = '11111111-1111-4111-8111-111111111111';

  it('creates only pending staff through shell HTTP with an idempotency key', async () => {
    const { directory, request, controller } = setup();
    const created = { ...staff, email: createInput.email, name: createInput.name,
      status: 'PENDING_VERIFICATION' };
    request.mockResolvedValue({ ok: true, status: 201, data: created });

    expect(await directory.create(createInput, key)).toEqual({ kind: 'created', staff: created });
    expect(request).toHaveBeenCalledWith({
      method: 'POST', path: '/api/v1/auth/register', body: createInput,
      headers: { 'Idempotency-Key': key }, signal: controller.signal,
    });
  });

  it('trims the staff name before sending it to Auth', async () => {
    const { directory, request } = setup();
    request.mockResolvedValue({ ok: true, status: 201, data: {
      ...staff, email: createInput.email, name: createInput.name,
      status: 'PENDING_VERIFICATION',
    } });
    expect((await directory.create({ ...createInput, name: `  ${createInput.name}  ` }, key)).kind)
      .toBe('created');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ body: createInput }));
  });

  it('rejects administrator creation and passwords over 72 UTF-8 bytes before HTTP', async () => {
    const { directory, request } = setup();
    expect(await directory.create({ ...createInput, role: 'ADMINISTRATOR' as never }, key))
      .toEqual({ kind: 'invalid' });
    expect(await directory.create({ ...createInput, password: 'A1' + 'á'.repeat(36) }, key))
      .toEqual({ kind: 'invalid' });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'invalid'], [401, 'session-expired'], [403, 'forbidden'],
    [409, 'conflict'], [503, 'unavailable'],
  ])('maps create HTTP %i to %s', async (status, kind) => {
    const { directory, request } = setup();
    request.mockResolvedValue({ ok: false, status });
    expect(await directory.create(createInput, key)).toEqual({ kind });
  });

  it('rejects a private or non-pending creation response and handles transport failure', async () => {
    const { directory, request } = setup();
    request.mockResolvedValueOnce({ ok: true, status: 201,
      data: { ...staff, status: 'PENDING_VERIFICATION', passwordHash: 'secret' } });
    request.mockResolvedValueOnce({ ok: true, status: 201, data: staff });
    request.mockRejectedValueOnce(new Error('offline'));
    expect(await directory.create(createInput, key)).toEqual({ kind: 'unavailable' });
    expect(await directory.create(createInput, key)).toEqual({ kind: 'unavailable' });
    expect(await directory.create(createInput, key)).toEqual({ kind: 'unavailable' });
  });
});
