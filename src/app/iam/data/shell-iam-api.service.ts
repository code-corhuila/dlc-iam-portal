import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, map } from 'rxjs';
import { PortalContext } from '../../shell-contract';
import { LoginCredentials } from '../model/auth';
import { IamApiService } from './iam-api.service';

export const IAM_PORTAL_CONTEXT =
  new InjectionToken<PortalContext>('IAM_PORTAL_CONTEXT');

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

  override login(credentials: LoginCredentials): Observable<void> {
    return defer(() => {
      if (this.context.signal.aborted ||
          typeof this.context.iamSession?.complete !== 'function') {
        throw new Error('Login cancelled');
      }
      return this.context.iamSession.complete({
        operationId: 'AuthLogin',
        body: credentials,
      });
    }).pipe(
      map((result) => {
        if (this.context.signal.aborted || !result.ok || result.status !== 200 ||
            typeof result.data !== 'object' || result.data === null ||
            (result.data as { state?: unknown }).state !== 'authenticated') {
          throw new Error('Authentication could not be completed');
        }
      }),
    );
  }
}
