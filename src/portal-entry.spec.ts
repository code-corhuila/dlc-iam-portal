/// <reference types="vitest/globals" />
import { mount } from './portal-entry';
import type { PortalContext, PortalHandle, PortalRoute } from './app/shell-contract';

describe('IAM portal entry', () => {
  const route: PortalRoute = {
    compositionId: 'a3f80675-6c3d-4f10-8d78-60ed82da53a7',
    globalPath: '/login',
    basePath: '/login',
    localPath: '/',
    query: {},
    fragment: '',
  };

  let host: HTMLElement;
  let controller: AbortController;
  let handle: PortalHandle | undefined;
  let context: PortalContext;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    controller = new AbortController();
    handle = undefined;
    context = {
      contractVersion: 1,
      portalId: 'iam',
      mountId: 'd93779b2-701a-4e5a-8e20-183306900dc0',
      compositionId: route.compositionId,
      route,
      signal: controller.signal,
      navigation: undefined,
      session: undefined,
      http: {
        request: vi.fn().mockRejectedValue(new Error('Transport unavailable')),
      },
      reportFailure: vi.fn(),
      iamSession: undefined,
    };
  });

  afterEach(async () => {
    await handle?.unmount();
    host.remove();
  });

  it('mounts, updates its local route and unmounts twice', async () => {
    handle = await mount(host, context);

    expect(host.querySelector('dlc-iam-page')).not.toBeNull();
    expect(host.style.getPropertyValue('--iam-clinic-background'))
      .toContain('auth-clinic-background.png');
    expect(await handle.canLeave()).toBe(true);

    await handle.updateRoute({ ...route, localPath: '/unknown' });
    expect(host.textContent).toContain('Página no encontrada');

    await handle.unmount();
    await handle.unmount();

    expect(host.style.getPropertyValue('--iam-clinic-background')).toBe('');
    await expect(handle.updateRoute(route))
      .rejects.toThrow('Invalid IAM route update');
  });

  it('rejects a mount whose signal was already aborted', async () => {
    controller.abort();

    await expect(mount(host, context))
      .rejects.toThrow('Invalid IAM mount context');
    expect(host.hasChildNodes()).toBe(false);
  });
});
