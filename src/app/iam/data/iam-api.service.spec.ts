/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FakeIamApiService } from './fake-iam-api.service';
import { IamApiService } from './iam-api.service';

describe('IamApiService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not pretend to create a session in the standalone preview', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: IamApiService, useClass: FakeIamApiService }],
    });
    const storageWrite = vi.fn();
    vi.stubGlobal('localStorage', { setItem: storageWrite });
    vi.stubGlobal('sessionStorage', { setItem: storageWrite });
    const api = TestBed.inject(IamApiService);

    await expect(firstValueFrom(api.login({
      email: 'staff@example.test',
      password: 'StrongPass1',
    }))).rejects.toThrow('Login requires the shell session capability');
    expect(storageWrite).not.toHaveBeenCalled();
  });
});
