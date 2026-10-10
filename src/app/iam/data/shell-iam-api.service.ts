import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, map } from 'rxjs';
import { PortalContext } from '../../shell-contract';
import { LoginCredentials, MfaChallenge } from '../model/auth';
import { IamApiService } from './iam-api.service';

export const IAM_PORTAL_CONTEXT =
  new InjectionToken<PortalContext>('IAM_PORTAL_CONTEXT');

function parseMfaChallenge(value: unknown): MfaChallenge {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid MFA challenge');
  }

  const body = value as Record<string, unknown>;
  const challengeId = body['challengeId'];
  const expiresAt = body['expiresAt'];

  if (
    Object.keys(body).length !== 3 ||
    typeof challengeId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId) ||
    typeof expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(expiresAt)) ||
    body['mfaRequired'] !== true
  ) {
    throw new Error('Invalid MFA challenge');
  }

  return { challengeId, expiresAt, mfaRequired: true };
}

@Injectable()
export class ShellIamApiService extends IamApiService {
  private readonly context = inject(IAM_PORTAL_CONTEXT);

  override requestPasswordRecovery(email: string): Observable<void> {
    return defer(() => {
      if (this.context.signal.aborted) throw new Error('Recovery cancelled');

      return this.context.http.request({
        method: 'POST',
        path: '/api/v1/auth/password-recovery-requests',
        body: { email },
        signal: this.context.signal,
      });
    }).pipe(
      map((result) => {
        if (this.context.signal.aborted || !result.ok || result.status !== 200) {
          throw new Error('Password recovery could not be requested');
        }

        const data = result.data;
        if (
          typeof data !== 'object' || data === null || Array.isArray(data) ||
          Object.keys(data).length !== 1 ||
          typeof (data as Record<string, unknown>)['message'] !== 'string' ||
          !(data as { message: string }).message.trim()
        ) {
          throw new Error('Invalid password recovery response');
        }
      }),
    );
  }

  override login(credentials: LoginCredentials): Observable<MfaChallenge> {
    return defer(() => {
      if (this.context.signal.aborted) {
        throw new Error('Login cancelled');
      }

      return this.context.http.request({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: credentials,
        signal: this.context.signal,
      });
    }).pipe(
      map((result) => {
        if (this.context.signal.aborted || !result.ok || result.status !== 200) {
          throw new Error('Authentication could not be completed');
        }

        return parseMfaChallenge(result.data);
      }),
    );
  }
}
