export type StaffRole = 'ADMINISTRATOR' | 'DENTIST' | 'SECRETARY_ASSISTANT';
export type StaffStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'LOCKED' | 'DISABLED';

export interface Staff {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly roles: readonly StaffRole[];
  readonly status: StaffStatus;
  readonly version: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface StaffPage {
  readonly data: readonly Staff[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
