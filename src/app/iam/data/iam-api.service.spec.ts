/// <reference types="vitest/globals" />
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IamApiService } from './iam-api.service';

describe('IamApiService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns an MFA challenge without storing a session', () => {
    TestBed.configureTestingModule({
      providers: [IamApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    const api = TestBed.inject(IamApiService);
    const http = TestBed.inject(HttpTestingController);
    const storageWrite = vi.fn();
    vi.stubGlobal('localStorage', { setItem: storageWrite });
    vi.stubGlobal('sessionStorage', { setItem: storageWrite });

    const credentials = {
      email: 'staff@example.test',
      password: 'StrongPass1',
    };
    const challenge = {
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: '2026-10-06T12:05:00Z',
      mfaRequired: true,
    };

    let result: unknown;
    api.login(credentials).subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);

    request.flush(challenge);

    expect(result).toEqual(challenge);
    expect(result).not.toHaveProperty('accessToken');
    expect(storageWrite).not.toHaveBeenCalled();
    http.verify();
  });
});
