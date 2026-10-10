import { Injectable, inject } from '@angular/core';
import { IAM_PORTAL_CONTEXT } from './shell-iam-api.service';
import type { Staff, StaffPage } from '../model/staff';

export type StaffListResult =
  | { readonly kind: 'loaded'; readonly page: StaffPage }
  | { readonly kind: 'forbidden' | 'session-expired' | 'unavailable' };

export type StaffReadResult =
  | { readonly kind: 'loaded'; readonly staff: Staff }
  | { readonly kind: 'forbidden' | 'not-found' | 'session-expired' | 'unavailable' };

export interface StaffCreateInput {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly role: 'DENTIST' | 'SECRETARY_ASSISTANT';
}

export type StaffCreateResult =
  | { readonly kind: 'created'; readonly staff: Staff }
  | { readonly kind: 'invalid' | 'conflict' | 'forbidden' | 'session-expired' | 'unavailable' };

export type StaffUpdateResult =
  | { readonly kind: 'updated'; readonly staff: Staff }
  | { readonly kind: 'invalid' | 'conflict' | 'forbidden' | 'not-found' |
      'session-expired' | 'unavailable' };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const roles = new Set(['ADMINISTRATOR', 'DENTIST', 'SECRETARY_ASSISTANT']);
const statuses = new Set(['PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DISABLED']);
const staffKeys = new Set(['id', 'email', 'name', 'roles', 'status', 'version', 'createdAt', 'updatedAt']);
const pageLimit = 20;
const staffIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStaff(value: unknown): value is Staff {
  if (!record(value)) return false;
  return Object.keys(value).every((key) => staffKeys.has(key)) &&
    typeof value['id'] === 'string' &&
    staffIdPattern.test(value['id']) &&
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

  async updateName(id: string, name: string, expectedVersion: number): Promise<StaffUpdateResult> {
    const trimmedName = name.trim();
    if (!staffIdPattern.test(id) || !trimmedName || trimmedName.length > 100 ||
        !Number.isInteger(expectedVersion) || expectedVersion < 1) return { kind: 'invalid' };
    if (this.context.signal.aborted) return { kind: 'unavailable' };
    try {
      const result = await this.context.http.request({
        method: 'PATCH', path: `/api/v1/auth/staff/${id}`,
        body: { name: trimmedName, expectedVersion }, signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) {
        return { kind: result.status === 400 ? 'invalid' :
          result.status === 401 ? 'session-expired' :
          result.status === 403 ? 'forbidden' :
          result.status === 404 ? 'not-found' :
          result.status === 409 ? 'conflict' : 'unavailable' };
      }
      if (result.status !== 200 || !isStaff(result.data) ||
          result.data.id.toLowerCase() !== id.toLowerCase()) return { kind: 'unavailable' };
      return { kind: 'updated', staff: result.data };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async create(input: StaffCreateInput, key: string): Promise<StaffCreateResult> {
    const name = input.name.trim();
    const passwordBytes = new TextEncoder().encode(input.password).length;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 255 ||
        !name || name.length > 100 ||
        input.password.length < 8 || input.password.length > 72 || passwordBytes > 72 ||
        !/[A-Z]/.test(input.password) || !/[0-9]/.test(input.password) ||
        (input.role !== 'DENTIST' && input.role !== 'SECRETARY_ASSISTANT') ||
        !staffIdPattern.test(key)) return { kind: 'invalid' };
    if (this.context.signal.aborted) return { kind: 'unavailable' };
    try {
      const result = await this.context.http.request({
        method: 'POST', path: '/api/v1/auth/register', body: { ...input, name },
        headers: { 'Idempotency-Key': key }, signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) {
        return { kind: result.status === 400 ? 'invalid' :
          result.status === 401 ? 'session-expired' :
          result.status === 403 ? 'forbidden' :
          result.status === 409 ? 'conflict' : 'unavailable' };
      }
      if (result.status !== 201 || !isStaff(result.data) ||
          result.data.status !== 'PENDING_VERIFICATION' ||
          result.data.roles.length !== 1 || result.data.roles[0] !== input.role) {
        return { kind: 'unavailable' };
      }
      return { kind: 'created', staff: result.data };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async read(id: string): Promise<StaffReadResult> {
    if (!staffIdPattern.test(id) || this.context.signal.aborted) return { kind: 'unavailable' };
    try {
      const result = await this.context.http.request({
        method: 'GET', path: `/api/v1/auth/staff/${id}`, signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) {
        return { kind: result.status === 401 ? 'session-expired' :
          result.status === 403 ? 'forbidden' :
          result.status === 404 ? 'not-found' : 'unavailable' };
      }
      if (result.status !== 200 || !isStaff(result.data) ||
          result.data.id.toLowerCase() !== id.toLowerCase()) return { kind: 'unavailable' };
      return { kind: 'loaded', staff: result.data };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async list(page: number): Promise<StaffListResult> {
    if (!Number.isInteger(page) || page < 1 || this.context.signal.aborted) {
      return { kind: 'unavailable' };
    }
    try {
      const result = await this.context.http.request({
        method: 'GET',
        path: '/api/v1/auth/staff',
        query: { page: [String(page)], limit: [String(pageLimit)] },
        signal: this.context.signal,
      });
      if (this.context.signal.aborted) return { kind: 'unavailable' };
      if (!result.ok) {
        return { kind: result.status === 401 ? 'session-expired' :
          result.status === 403 ? 'forbidden' : 'unavailable' };
      }
      if (result.status !== 200 || !isStaffPage(result.data) || result.data.meta.page !== page) {
        return { kind: 'unavailable' };
      }
      return { kind: 'loaded', page: result.data };
    } catch {
      return { kind: 'unavailable' };
    }
  }
}
