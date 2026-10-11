/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  function setup() {
    const controller = new AbortController();
    const request = vi.fn();
    TestBed.configureTestingModule({ providers: [
      { provide: IAM_PORTAL_CONTEXT, useValue: { signal: controller.signal, http: { request } } },
      PasswordResetService,
    ] });
    return { service: TestBed.inject(PasswordResetService), request, controller };
  }

  it('sends a valid token and password only through shell HTTP', async () => {
    const { service, request, controller } = setup();
    request.mockResolvedValue({ ok: true, status: 200, data: { message: 'Done' } });
    expect(await service.reset('  proof-123  ', 'StrongPass1')).toBe('reset');
    expect(request).toHaveBeenCalledWith({
      method: 'POST', path: '/api/v1/auth/password-resets',
      body: { token: 'proof-123', password: 'StrongPass1' }, signal: controller.signal,
    });
  });

  it('rejects empty proof and passwords outside the approved policy before HTTP', async () => {
    const { service, request } = setup();
    for (const [token, password] of [
      [' ', 'StrongPass1'], ['proof', 'short1A'], ['proof', 'lowercase1'],
      ['proof', 'NoDigitsHere'], ['proof', 'A1' + 'á'.repeat(36)],
    ]) {
      expect(await service.reset(token, password)).toBe('invalid');
    }
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'rejected'], [409, 'rejected'], [429, 'rate-limited'], [503, 'unavailable'],
  ])('maps Auth %i without exposing its message', async (status, expected) => {
    const { service, request } = setup();
    request.mockResolvedValue({ ok: false, status, message: 'Sensitive backend detail' });
    expect(await service.reset('proof', 'StrongPass1')).toBe(expected);
  });

  it('rejects a malformed acknowledgement and an aborted mount', async () => {
    const { service, request, controller } = setup();
    request.mockResolvedValue({ ok: true, status: 200,
      data: { message: 'Done', passwordHash: 'secret' } });
    expect(await service.reset('proof', 'StrongPass1')).toBe('unavailable');
    controller.abort();
    expect(await service.reset('proof', 'StrongPass1')).toBe('unavailable');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
