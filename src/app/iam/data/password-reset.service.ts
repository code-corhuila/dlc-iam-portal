import { Injectable, inject } from '@angular/core';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';

export type PasswordResetResult = 'reset' | 'invalid' | 'rejected' | 'rate-limited' | 'unavailable';

@Injectable()
export class PasswordResetService {
  private readonly context = inject(IAM_PORTAL_CONTEXT);

  async reset(token: string, password: string): Promise<PasswordResetResult> {
    const proof = token.trim();
    // Mirrors the Auth policy in 07-api/authentication.md; Auth remains authoritative.
    if (!proof || !password || password.length < 8 || password.length > 72 ||
        new TextEncoder().encode(password).length > 72 ||
        !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'invalid';
    if (this.context.signal.aborted) return 'unavailable';

    try {
      const result = await this.context.http.request({
        method: 'POST', path: '/api/v1/auth/password-resets',
        body: { token: proof, password }, signal: this.context.signal,
      });
      if (this.context.signal.aborted) return 'unavailable';
      if (!result.ok) {
        return result.status === 400 || result.status === 409 ? 'rejected' :
          result.status === 429 ? 'rate-limited' : 'unavailable';
      }
      const data = result.data;
      return result.status === 200 && typeof data === 'object' && data !== null &&
        !Array.isArray(data) && Object.keys(data).length === 1 &&
        typeof (data as Record<string, unknown>)['message'] === 'string' &&
        !!(data as { message: string }).message.trim() ? 'reset' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
}
