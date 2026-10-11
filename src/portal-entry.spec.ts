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
      navigation: { request: vi.fn().mockResolvedValue({ status: 'applied' }) },
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

    const recoveryLink = host.querySelector<HTMLButtonElement>('.text-link');
    if (!recoveryLink) throw new Error('Recovery link is missing');
    recoveryLink.click();
    expect(context.navigation.request).toHaveBeenCalledWith({ path: '/recover-password' });

    await handle.updateRoute({
      ...route,
      globalPath: '/recover-password',
      basePath: '/recover-password',
    });
    expect(host.querySelector('dlc-recover-password')).not.toBeNull();
    const verifyButton = [...host.querySelectorAll<HTMLButtonElement>(
      'dlc-recover-password .text-link',
    )].find((button) => button.textContent?.includes('código de verificación'));
    if (!verifyButton) throw new Error('Email verification link is missing');
    verifyButton.click();
    expect(context.navigation.request).toHaveBeenCalledWith({
      path: '/recover-password/verify-email',
    });
    await handle.updateRoute({
      ...route, globalPath: '/recover-password/verify-email',
      basePath: '/recover-password', localPath: '/verify-email',
    });
    expect(host.querySelector('dlc-email-verification')).not.toBeNull();
    await handle.updateRoute({
      ...route, globalPath: '/recover-password', basePath: '/recover-password',
    });
    const backButton = [...host.querySelectorAll<HTMLButtonElement>(
      'dlc-recover-password .text-link',
    )].find((button) => button.textContent?.includes('Volver a iniciar sesión'));
    if (!backButton) throw new Error('Back to login button is missing');
    backButton.click();
    expect(context.navigation.request).toHaveBeenCalledWith({ path: '/login' });

    const resetButton = [...host.querySelectorAll<HTMLButtonElement>('dlc-recover-password .text-link')]
      .find((button) => button.textContent?.includes('código de recuperación'));
    resetButton?.click();
    expect(context.navigation.request).toHaveBeenCalledWith({ path: '/recover-password/reset' });
    await handle.updateRoute({
      ...route, globalPath: '/recover-password/reset',
      basePath: '/recover-password', localPath: '/reset',
    });
    expect(host.querySelector('dlc-reset-password')).not.toBeNull();

    await handle.updateRoute({
      ...route, globalPath: '/app/administration', basePath: '/app/administration',
    });
    expect(host.querySelector('dlc-staff-directory')).not.toBeNull();

    await handle.updateRoute({
      ...route, globalPath: '/app/sessions', basePath: '/app/sessions',
    });
    expect(host.querySelector('dlc-own-sessions')).not.toBeNull();

    await handle.updateRoute({ ...route, localPath: '/unknown' });
    expect(host.textContent).toContain('Página no encontrada');

    await handle.unmount();
    await handle.unmount();

    expect(host.style.getPropertyValue('--iam-clinic-background')).toBe('');
    await expect(handle.updateRoute(route))
      .rejects.toThrow('Invalid IAM route update');
  });

  it('mounts the own-sessions screen from a direct shell route', async () => {
    handle = await mount(host, {
      ...context,
      route: { ...route, globalPath: '/app/sessions', basePath: '/app/sessions' },
    });

    expect(host.querySelector('dlc-own-sessions')).not.toBeNull();
    await vi.waitFor(() => expect(context.http.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/api/v1/auth/sessions' }),
    ));
  });

  it('rejects a mount whose signal was already aborted', async () => {
    controller.abort();

    await expect(mount(host, context))
      .rejects.toThrow('Invalid IAM mount context');
    expect(host.hasChildNodes()).toBe(false);
  });
});
