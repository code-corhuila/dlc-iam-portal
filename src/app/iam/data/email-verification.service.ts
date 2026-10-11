import { Injectable, inject } from '@angular/core';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';

export type EmailVerificationResult =
  'verified' | 'invalid' | 'conflict' | 'rate-limited' | 'unavailable';

@Injectable()
export class EmailVerificationService {
  private readonly context = inject(IAM_PORTAL_CONTEXT);

  async verify(token: string): Promise<EmailVerificationResult> {
    const trimmedToken = token.trim();
    if (!trimmedToken) return 'invalid';
    if (this.context.signal.aborted) return 'unavailable';

    try {
      const result = await this.context.http.request({
        method: 'POST',
        path: '/api/v1/auth/email-verifications',
        body: { token: trimmedToken },
        signal: this.context.signal,
      });
      if (this.context.signal.aborted) return 'unavailable';
      if (!result.ok) {
        return result.status === 400 ? 'invalid' :
          result.status === 409 ? 'conflict' :
          result.status === 429 ? 'rate-limited' : 'unavailable';
      }
      const data = result.data;
      if (result.status !== 200 || typeof data !== 'object' || data === null ||
          Array.isArray(data) || Object.keys(data).length !== 1 ||
          typeof (data as Record<string, unknown>)['message'] !== 'string' ||
          !(data as { message: string }).message.trim()) return 'unavailable';
      return 'verified';
    } catch {
      return 'unavailable';
    }
  }
}
