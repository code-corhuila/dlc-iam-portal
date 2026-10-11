/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  function setup() {
    const controller = new AbortController();
    const request = vi.fn();
    TestBed.configureTestingModule({ providers: [
      { provide: IAM_PORTAL_CONTEXT, useValue: {
        signal: controller.signal, http: { request },
      } },
      EmailVerificationService,
    ] });
    return { service: TestBed.inject(EmailVerificationService), request, controller };
  }

  it('sends only the trimmed token through shell HTTP', async () => {
    const { service, request, controller } = setup();
    request.mockResolvedValue({ ok: true, status: 200, data: { message: 'Verified' } });

    expect(await service.verify('  secret-token  ')).toBe('verified');
    expect(request).toHaveBeenCalledWith({
      method: 'POST', path: '/api/v1/auth/email-verifications',
      body: { token: 'secret-token' }, signal: controller.signal,
    });
  });

  it('rejects empty input without contacting Auth', async () => {
    const { service, request } = setup();
    expect(await service.verify('  ')).toBe('invalid');
    expect(request).not.toHaveBeenCalled();
  });

  it.each([400, 409])('treats HTTP %i as an invalid token', async (status) => {
    const { service, request } = setup();
    request.mockResolvedValue({ ok: false, status });
    expect(await service.verify('secret-token')).toBe('invalid');
  });

  it('distinguishes rate limiting from a service failure', async () => {
    const { service, request } = setup();
    request.mockResolvedValueOnce({ ok: false, status: 429 });
    request.mockResolvedValueOnce({ ok: false, status: 503 });
    expect(await service.verify('secret-token')).toBe('rate-limited');
    expect(await service.verify('secret-token')).toBe('unavailable');
  });

  it('does not accept an unexpected field in a success response', async () => {
    const { service, request } = setup();
    request.mockResolvedValue({
      ok: true, status: 200, data: { message: 'Verified', token: 'leaked' },
    });
    expect(await service.verify('secret-token')).toBe('unavailable');
  });

  it('does not send a request after unmount', async () => {
    const { service, request, controller } = setup();
    controller.abort();
    expect(await service.verify('secret-token')).toBe('unavailable');
    expect(request).not.toHaveBeenCalled();
  });
});
