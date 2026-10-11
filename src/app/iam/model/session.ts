export interface OwnSession {
  readonly id: string;
  readonly expiresAt: string;
  readonly current: boolean;
  readonly version: number;
  readonly device?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly lastUserActivityAt?: string;
}

export interface OwnSessionPage {
  readonly data: readonly OwnSession[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
