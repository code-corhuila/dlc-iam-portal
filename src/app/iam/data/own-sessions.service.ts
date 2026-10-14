import { Injectable, inject } from '@angular/core';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import type { OwnSession, OwnSessionPage } from '../model/session';

export type OwnSessionsResult =
  | { readonly kind: 'loaded'; readonly page: OwnSessionPage }
  | { readonly kind: 'invalid' | 'forbidden' | 'session-expired' | 'unavailable' };

export type OwnSessionRevokeResult =
  | { readonly kind: 'revoked' }
  | { readonly kind: 'invalid' | 'forbidden' | 'not-found' | 'conflict' |
      'session-expired' | 'unavailable' };

const pageLimit = 20;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sessionKeys = new Set([
  'id', 'expiresAt', 'current', 'version', 'device', 'createdAt', 'updatedAt',
  'lastUserActivityAt',
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isSession(value: unknown): value is OwnSession {
  if (!record(value) || Object.keys(value).some((key) => !sessionKeys.has(key))) return false;
  return typeof value['id'] === 'string' && uuidPattern.test(value['id']) &&
    timestamp(value['expiresAt']) && typeof value['current'] === 'boolean' &&
    Number.isInteger(value['version']) && (value['version'] as number) >= 1 &&
    (value['device'] === undefined ||
      (typeof value['device'] === 'string' && value['device'].length > 0 && value['device'].length <= 200)) &&
    ['createdAt', 'updatedAt', 'lastUserActivityAt'].every((key) =>
      value[key] === undefined || timestamp(value[key]));
}

function isPage(value: unknown): value is OwnSessionPage {
  if (!record(value) || Object.keys(value).some((key) => key !== 'data' && key !== 'meta')) return false;
  const meta = value['meta'];
  return Array.isArray(value['data']) && value['data'].every(isSession) && record(meta) &&
    Number.isInteger(meta['page']) && (meta['page'] as number) >= 1 &&
    Number.isInteger(meta['limit']) && (meta['limit'] as number) >= 1 && (meta['limit'] as number) <= 100 &&
    Number.isInteger(meta['total']) && (meta['total'] as number) >= 0 &&
    Number.isInteger(meta['totalPages']) && (meta['totalPages'] as number) >= 0;
}

@Injectable()
export class OwnSessionsService {
  private readonly context = inject(IAM_PORTAL_CONTEXT);

  async revoke(id: string, reason: string, key: string): Promise<OwnSessionRevokeResult> {
    const trimmedReason = reason.trim();
    if (!uuidPattern.test(id) || !uuidPattern.test(key) ||
        !trimmedReason || trimmedReason.length > 1000) return { kind: 'invalid' };
    if (this.context.signal.aborted) return { kind: 'unavailable' };
    try {
      const result = await this.context.http.request({
        method: 'POST', path: `/api/v1/auth/sessions/${id}/revocations`,
        body: { reason: trimmedReason }, headers: { 'Idempotency-Key': key },
        responseType: 'none', signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) {
        return { kind: result.status === 400 ? 'invalid' :
          result.status === 401 ? 'session-expired' :
          result.status === 403 ? 'forbidden' :
          result.status === 404 ? 'not-found' :
          result.status === 409 ? 'conflict' : 'unavailable' };
      }
      return result.status === 204 ? { kind: 'revoked' } : { kind: 'unavailable' };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async list(page: number): Promise<OwnSessionsResult> {
    if (!Number.isInteger(page) || page < 1) return { kind: 'invalid' };
    if (this.context.signal.aborted) return { kind: 'unavailable' };
    try {
      const result = await this.context.http.request({
        method: 'GET', path: '/api/v1/auth/sessions',
        query: { page: [String(page)], limit: [String(pageLimit)] },
        signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) {
        return { kind: result.status === 400 ? 'invalid' :
          result.status === 401 ? 'session-expired' :
          result.status === 403 ? 'forbidden' : 'unavailable' };
      }
      return result.status === 200 && isPage(result.data) && result.data.meta.page === page
        ? { kind: 'loaded', page: result.data } : { kind: 'unavailable' };
    } catch {
      return { kind: 'unavailable' };
    }
  }
}
