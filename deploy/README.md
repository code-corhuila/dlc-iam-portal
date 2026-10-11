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

The `dlc-front` team can register the release and proxy `/portals/iam/` to
`http://iam-portal-demo` on the shared network. Registration, route selection,
and live Auth/Gateway verification are separate integration steps.
