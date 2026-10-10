export interface PortalRoute {
  readonly compositionId: string;
  readonly globalPath: string;
  readonly basePath: string;
  readonly localPath: string;
  readonly query: Readonly<Record<string, readonly string[]>>;
  readonly fragment: string;
}

export interface HttpRequest {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly path: `/api/v1/${string}`;
  readonly query?: Readonly<Record<string, readonly string[]>>;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly responseType?: 'json' | 'blob' | 'none';
  readonly signal?: AbortSignal;
}

export type HttpResult =
  | {
      readonly ok: true;
      readonly status: number;
      readonly data: unknown;
      readonly headers: Readonly<Record<string, string>>;
      readonly correlationId: string;
    }
  | {
      readonly ok: false;
      readonly status: number;
      readonly error: string;
      readonly message: string;
      readonly details: unknown;
      readonly traceId: string | null;
      readonly correlationId: string;
      readonly kind: 'http' | 'network' | 'timeout' | 'cancelled' | 'contract' | 'session';
      readonly retryable: boolean;
    };

export interface PortalContext {
  readonly contractVersion: 1;
  readonly portalId: 'iam';
  readonly mountId: string;
  readonly compositionId: string;
  readonly route: PortalRoute;
  readonly signal: AbortSignal;
  readonly navigation: unknown;
  readonly session: unknown;
  readonly http: { request(request: HttpRequest): Promise<HttpResult> };
  readonly reportFailure: (
    failure: { readonly code: 'PORTAL_RENDER_FAILED' | 'PORTAL_TASK_FAILED' },
  ) => void;
  readonly iamSession: unknown;
}

export interface PortalHandle {
  updateRoute(route: PortalRoute): Promise<void>;
  canLeave(): Promise<boolean>;
  unmount(): Promise<void>;
}
