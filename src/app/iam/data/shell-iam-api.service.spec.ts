/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { IamApiService } from './iam-api.service';
import { IAM_PORTAL_CONTEXT, ShellIamApiService } from './shell-iam-api.service';

describe('ShellIamApiService', () => {
  it('uses shell HTTP and rejects a malformed MFA response', async () => {
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
    const credentials = { email: 'user@example.test', password: 'test-password' };
    const challenge = {
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      mfaRequired: true,
    };
    const success = (data: unknown) => ({
      ok: true, status: 200, data, headers: {}, correlationId: 'test-id',
    });

    request.mockResolvedValueOnce(success(challenge));
    expect(await firstValueFrom(api.login(credentials))).toEqual(challenge);
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: credentials,
      signal: controller.signal,
    });

    request.mockResolvedValueOnce(success({ ...challenge, accessToken: 'unexpected' }));
    await expect(firstValueFrom(api.login(credentials)))
      .rejects.toThrow('Invalid MFA challenge');
  });
});