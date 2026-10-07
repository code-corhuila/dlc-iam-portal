/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FakeIamApiService } from './fake-iam-api.service';
import { IamApiService } from './iam-api.service';

describe('IamApiService', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('returns an MFA challenge without creating a session', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: IamApiService, useClass: FakeIamApiService }],
    });
    const storageWrite = vi.fn();
    vi.stubGlobal('localStorage', { setItem: storageWrite });
    vi.stubGlobal('sessionStorage', { setItem: storageWrite });
    const api = TestBed.inject(IamApiService);
    const challenge = await firstValueFrom(api.login({
      email: 'staff@example.test',
      password: 'StrongPass1',
    }));
    expect(challenge.challengeId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(Date.parse(challenge.expiresAt)).toBeGreaterThan(Date.now());
    expect(challenge.mfaRequired).toBe(true);
    expect(challenge).not.toHaveProperty('accessToken');
    expect(storageWrite).not.toHaveBeenCalled();
  });
    it('rejects credentials outside the local fixture', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: IamApiService, useClass: FakeIamApiService }],
    });
    const api = TestBed.inject(IamApiService);
    await expect(firstValueFrom(api.login({
      email: 'staff@example.test',
      password: 'wrong-password',
    }))).rejects.toThrow('Invalid credentials');
  });
});
