import { Injectable, inject } from '@angular/core';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import type { Staff, StaffPage } from '../model/staff';

export type StaffListResult =
  | { readonly kind: 'loaded'; readonly page: StaffPage }
  | { readonly kind: 'forbidden' | 'unavailable' };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const roles = new Set(['ADMINISTRATOR', 'DENTIST', 'SECRETARY_ASSISTANT']);
const statuses = new Set(['PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DISABLED']);
const staffKeys = new Set(['id', 'email', 'name', 'roles', 'status', 'version', 'createdAt', 'updatedAt']);

function isStaff(value: unknown): value is Staff {
  if (!record(value)) return false;
  return Object.keys(value).every((key) => staffKeys.has(key)) &&
    typeof value['id'] === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value['id']) &&
    typeof value['email'] === 'string' && value['email'].length > 0 &&
    typeof value['name'] === 'string' && value['name'].length > 0 && value['name'].length <= 100 &&
    Array.isArray(value['roles']) && value['roles'].every((role: unknown) => roles.has(role as string)) &&
    typeof value['status'] === 'string' && statuses.has(value['status']) &&
    Number.isInteger(value['version']) && (value['version'] as number) >= 1 &&
    (value['createdAt'] === undefined ||
      (typeof value['createdAt'] === 'string' && Number.isFinite(Date.parse(value['createdAt'])))) &&
    (value['updatedAt'] === undefined ||
      (typeof value['updatedAt'] === 'string' && Number.isFinite(Date.parse(value['updatedAt']))));
}

function isStaffPage(value: unknown): value is StaffPage {
  if (!record(value) || Object.keys(value).some((key) => key !== 'data' && key !== 'meta')) return false;
  const meta = value['meta'];
  return Array.isArray(value['data']) && value['data'].every(isStaff) && record(meta) &&
    Number.isInteger(meta['page']) && (meta['page'] as number) >= 1 &&
    Number.isInteger(meta['limit']) && (meta['limit'] as number) >= 1 && (meta['limit'] as number) <= 100 &&
    Number.isInteger(meta['total']) && (meta['total'] as number) >= 0 &&
    Number.isInteger(meta['totalPages']) && (meta['totalPages'] as number) >= 0;
}

@Injectable()
export class StaffDirectoryService {
  private readonly context = inject(IAM_PORTAL_CONTEXT);

  async list(page: number): Promise<StaffListResult> {
    if (!Number.isInteger(page) || page < 1 || this.context.signal.aborted) {
      return { kind: 'unavailable' };
    }
    try {
      const result = await this.context.http.request({
        method: 'GET',
        path: '/api/v1/auth/staff',
        query: { page: [String(page)], limit: ['20'] },
        signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) return { kind: result.status === 403 ? 'forbidden' : 'unavailable' };
      if (result.status !== 200 || !isStaffPage(result.data) || result.data.meta.page !== page) {
        return { kind: 'unavailable' };
      }
      return { kind: 'loaded', page: result.data };
    } catch {
      return { kind: 'unavailable' };
    }
  }
}
