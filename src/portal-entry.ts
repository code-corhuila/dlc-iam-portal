import { Component, ErrorHandler, inject, signal } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { IamApiService } from './app/iam/data/iam-api.service';
import { RecoverPasswordComponent } from './app/iam/components/recover-password.component';
import {
  IAM_PORTAL_CONTEXT,
  ShellIamApiService,
} from './app/iam/data/shell-iam-api.service';
import { IamPageComponent } from './app/iam/pages/iam-page.component';
import type { PortalContext, PortalHandle, PortalRoute } from './app/shell-contract';

export const portalId = 'iam' as const;
export const contractVersion = 1 as const;

const ownedBases = new Set([
  '/login',
  '/recover-password',
  '/app/administration',
]);

@Component({
  selector: 'dlc-iam-portal-root',
  standalone: true,
  imports: [IamPageComponent, RecoverPasswordComponent],
  styleUrl: './app/iam/pages/iam-page.component.css',
  template: `
    @if (route().basePath === '/login' && route().localPath === '/') {
      <dlc-iam-page [showRecoveryLink]="true" (recoverPassword)="requestRoute('/recover-password')" />
    } @else if (route().basePath === '/recover-password' && route().localPath === '/') {
      <section class="iam-auth-surface" aria-label="Recuperación de contraseña">
        <dlc-recover-password (backToLogin)="requestRoute('/login')" />
      </section>
    } @else {
      <section role="status"><h1>Página no encontrada</h1></section>
    }
  `,
})
class IamPortalRootComponent {
  private readonly context = inject(IAM_PORTAL_CONTEXT);
  readonly route = signal(this.context.route);

  async requestRoute(path: '/login' | '/recover-password'): Promise<void> {
    try {
      await this.context.navigation.request({ path });
    } catch {
      this.context.reportFailure({ code: 'PORTAL_TASK_FAILED' });
    }
  }
}

function ownsRoute(route: PortalRoute): boolean {
  return ownedBases.has(route.basePath) &&
    typeof route.localPath === 'string' &&
    route.localPath.startsWith('/');
}

export async function mount(
  host: HTMLElement,
  context: PortalContext,
): Promise<PortalHandle> {
  if (
    !host ||
    host.hasChildNodes() ||
    context?.contractVersion !== contractVersion ||
    context.portalId !== portalId ||
    !context.route ||
    !ownsRoute(context.route) ||
    typeof context.http?.request !== 'function' ||
    typeof context.navigation?.request !== 'function' ||
    typeof context.reportFailure !== 'function' ||
    !context.signal ||
    context.signal.aborted
  ) {
    throw new Error('Invalid IAM mount context');
  }

  const app = await createApplication({
    providers: [
      { provide: IAM_PORTAL_CONTEXT, useValue: context },
      { provide: IamApiService, useClass: ShellIamApiService },
      {
        provide: ErrorHandler,
        useValue: {
          handleError: (_error: unknown) =>
            context.reportFailure({ code: 'PORTAL_RENDER_FAILED' }),
        },
      },
    ],
  });

  try {
    if (context.signal.aborted) {
      throw new Error('IAM mount cancelled');
    }

    const imageUrl = new URL('./auth-clinic-background.png', import.meta.url);
    host.style.setProperty(
      '--iam-clinic-background',
      `url("${imageUrl.href}")`,
    );

    const root = app.bootstrap(IamPortalRootComponent, host);
    let disposed = false;

    return {
      async updateRoute(route: PortalRoute): Promise<void> {
        if (disposed || context.signal.aborted || !route || !ownsRoute(route)) {
          throw new Error('Invalid IAM route update');
        }

        root.instance.route.set(route);
        root.changeDetectorRef.detectChanges();
      },

      async canLeave(): Promise<boolean> {
        return true;
      },

      async unmount(): Promise<void> {
        if (disposed) return;
        disposed = true;

        try {
          app.destroy();
        } finally {
          host.style.removeProperty('--iam-clinic-background');
        }
      },
    };
  } catch (error) {
    try {
      app.destroy();
    } finally {
      host.style.removeProperty('--iam-clinic-background');
    }
    throw error;
  }
}
