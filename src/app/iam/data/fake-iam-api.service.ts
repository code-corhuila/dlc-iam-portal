import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { LoginCredentials, MfaChallenge } from '../model/auth';
import { IamApiService } from './iam-api.service';

@Injectable()
export class FakeIamApiService extends IamApiService {
  override login(credentials: LoginCredentials): Observable<MfaChallenge> {
    if (
      credentials.email !== 'staff@example.test' ||
      credentials.password !== 'StrongPass1'
    ) {
      return throwError(() => new Error('Invalid credentials'));
    }

    return of({
      challengeId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      mfaRequired: true,
    });
  }
}
