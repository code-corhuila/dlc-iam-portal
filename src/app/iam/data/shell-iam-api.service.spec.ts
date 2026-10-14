/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { IamApiService } from './iam-api.service';
import { IAM_PORTAL_CONTEXT, ShellIamApiService } from './shell-iam-api.service';

describe('ShellIamApiService', () => {
  it('uses shell HTTP for recovery and validates its response', async () => {
    const controller = new AbortController();
    const request = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: IAM_PORTAL_CONTEXT,
          useValue: { signal: controller.signal, http: { request } },
        },
        { provide: IamApiService, useClass: ShellIamApiService },
      ],
    });
    const api = TestBed.inject(IamApiService);
    const success = (data: unknown) => ({
      ok: true, status: 200, data, headers: {}, correlationId: 'test-id',
    });

    request.mockResolvedValueOnce(success({ message: 'Request received' }));
    await expect(firstValueFrom(api.requestPasswordRecovery('staff@example.test')))
      .resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/v1/auth/password-recovery-requests',
      body: { email: 'staff@example.test' },
      signal: controller.signal,
    });

    request.mockResolvedValueOnce(success({ message: 'Request received', userId: 'leak' }));
    await expect(firstValueFrom(api.requestPasswordRecovery('staff@example.test')))
      .rejects.toThrow('Invalid password recovery response');
  });

  it('completes login through the shell and rejects an unauthenticated result', async () => {
    const controller = new AbortController();
    const request = vi.fn();
    const complete = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: IAM_PORTAL_CONTEXT,
          useValue: {
            signal: controller.signal, http: { request }, iamSession: { complete },
          },
        },
        { provide: IamApiService, useClass: ShellIamApiService },
      ],
    });

    const api = TestBed.inject(IamApiService);
    const credentials = { email: 'user@example.test', password: 'test-password' };
    complete.mockResolvedValueOnce({
      ok: true, status: 200, data: { state: 'authenticated' },
    });
    await expect(firstValueFrom(api.login(credentials))).resolves.toBeUndefined();
    expect(complete).toHaveBeenCalledWith({
      operationId: 'AuthLogin', body: credentials,
    });
    expect(request).not.toHaveBeenCalled();

    complete.mockResolvedValueOnce({
      ok: true, status: 200, data: { state: 'anonymous' },
    });
    await expect(firstValueFrom(api.login(credentials)))
      .rejects.toThrow('Authentication could not be completed');
  });
});
