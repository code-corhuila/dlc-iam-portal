import assert from 'node:assert/strict';

// Run against the deployed dlc-front origin, never against the Gateway directly.
const origin = process.env.FRONT_URL ?? 'http://localhost:8080';
const release = process.env.IAM_RELEASE ?? '0.1.0-local';
const base = new URL(origin);
assert.ok(['http:', 'https:'].includes(base.protocol));
assert.match(release, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);

async function request(path) {
  return fetch(new URL(path, base), { signal: AbortSignal.timeout(10_000) });
}

const moduleResponse = await request(`/portals/iam/${release}/entry.js`);
assert.equal(moduleResponse.status, 200, 'IAM module must load through dlc-front');
assert.match(moduleResponse.headers.get('content-type') ?? '', /javascript/);
const moduleText = await moduleResponse.text();
assert.match(moduleText, /mount/);

const registryResponse = await request('/portal-registry.json');
assert.equal(registryResponse.status, 200, 'front registry must load');
const registry = await registryResponse.json();
assert.ok(registry.portals?.some((portal) =>
  portal.portalId === 'iam' &&
  portal.entryUrl === `/portals/iam/${release}/entry.js`),
'front registry must select the deployed IAM release');

const configResponse = await request('/auth-config.json');
assert.equal(configResponse.status, 200, 'real Auth configuration must load');
const config = await configResponse.json();
assert.ok(typeof config.issuer === 'string' && config.issuer &&
  typeof config.audience === 'string' && config.audience);

const jwks = await request('/api/v1/auth/jwks');
assert.equal(jwks.status, 200, 'public JWKS must pass through the Gateway');
assert.ok(jwks.headers.get('x-correlation-id'), 'Gateway correlation header is required');
const keys = await jwks.json();
assert.ok(keys && Array.isArray(keys.keys), 'Auth must return a JWKS');

const sessions = await request('/api/v1/auth/sessions');
assert.equal(sessions.status, 401, 'Gateway must reject sessions without credentials');
assert.ok(sessions.headers.get('x-correlation-id'));

console.log('IAM module, front configuration, Gateway JWKS, and protected-route smoke passed');
