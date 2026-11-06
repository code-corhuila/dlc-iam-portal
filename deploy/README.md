# IAM browser module deployment

This image serves the IAM browser module built by `npm run build:portal` at
`/portals/iam/{release}/entry.js`. Its assets stay in the same release folder.
The container serves only static files; it does not provide an HTTP client,
session store, Gateway, or Auth service.

Start `dlc-front` first so its `dlc-front_default` network exists, then run:

```sh
docker compose -f deploy/compose.yml build
docker compose -f deploy/compose.yml up -d
docker compose -f deploy/compose.yml exec iam-portal-demo \
  wget -S -O /dev/null http://127.0.0.1/portals/iam/0.1.0-local/entry.js
```

The default release is `0.1.0-local`. Set `IAM_RELEASE` to a new immutable
release identifier for each deployment; it accepts letters, digits, dots,
underscores, and hyphens, starting with a letter or digit. `FRONT_NETWORK`
defaults to `dlc-front_default`. The Docker service name is `iam-portal-demo`,
its internal port is `80`, and it does not publish a host port.

The `dlc-front` registry must point to this exact release. Its `/portals/iam/`
proxy reaches `http://iam-portal-demo` on the front network. The portal sends
Auth requests only through the shell's `context.http` capability; login uses
`context.iamSession.complete`. The browser uses the front origin for all of them.

For the real stack, deploy `dlc-front` from its current `develop` with
`GATEWAY_UPSTREAM=http://dlc-api-gateway:8080/api/v1`, the `platform` network,
and an `AUTH_CONFIG_FILE` whose issuer and audience match `auth-service`.
Deploy `dlc-api-gateway` and `auth-service` on `platform`, and set the Gateway's
allowed origin to the browser origin of `dlc-front`. An older front image wired
to `mock-gateway:4010` does not exercise this integration.

From this repository, verify the deployed path without calling Auth directly:

```sh
FRONT_URL=http://localhost:8080 IAM_RELEASE=0.1.0-local npm run test:gateway
```

The smoke checks the portal module, registry release, real Auth configuration,
public JWKS through the Gateway, and the Gateway's rejection of an
unauthenticated sessions request. Auth must be
running for the JWKS check. This check does not sign in a staff account or send
email; exercise those separately with stage test accounts and the approved
delivery configuration.
