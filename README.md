# DLC IAM Portal

Angular 21 IAM portal with a standalone HU-IAM-001 development preview, a browser-module entry for `dlc-front`, and a HU-IAM-004 password-recovery request screen.

## Current state

The standalone development preview uses `FakeIamApiService` with `staff@example.test` / `StrongPass1`; it does not contact Auth or establish a session. The preview includes the Di Lucca header and footer. Its login form shows a generic error, and its MFA challenge stays in memory until expiry, restart, or unmount. Auth remains responsible for enforcing challenge expiry and single use.

The separate `entry.js` module implements the v1 `mount`/`updateRoute`/`canLeave`/`unmount` boundary. It receives HTTP from `dlc-front`, validates the Auth login challenge, and never creates a session. The `/recover-password` route sends a recovery request through that same capability and displays a generic acknowledgement without revealing account existence. Unknown IAM local routes display a local 404. The shell compositor and its HTTP capability are not yet running together with this module, so live Gateway and Docker acceptance remain pending. MFA proof submission, password reset, email verification, and administration screens are also pending.

CI runs the skeleton check, unit tests, the guarded standalone production build, and `npm run build:portal`. The latter emits `entry.js` and its clinic image together and rejects bundled preview credentials. The standalone production entry deliberately blocks startup. Native Federation configuration remains a legacy scaffold placeholder; the browser-module boundary follows [DLC-FRONT composition contract v1](https://github.com/code-corhuila/ods-docs/blob/main/05-architecture/frontend-composition.md).

## Local verification

```bash
npm run check:skeleton
npm test
npx ng run dlc-iam-portal:build-original:production
npm run build:portal
npx ng run dlc-iam-portal:serve-original
```

These checks do not validate the live Gateway, Docker deployment, email delivery, MFA proof, or browser session flow.

## Future responsibilities

- `src/app/iam/components/`: sign-in and password-recovery request forms; MFA completion remains pending.
- `src/app/iam/data/`: IAM API port, development-only fake adapter, and shell HTTP adapter.
- `src/app/iam/model/`: types based on the IAM OpenAPI contract.
- `src/app/iam/pages/`: IAM pages.
- `src/portal-entry.ts`: browser-module lifecycle for the compositor.
- `src/app/shell-contract.ts`: framework-neutral integration types.

`dlc-front` owns the browser session, shared HTTP client, and Gateway URL. The portal does not create or store sessions. `.github/CODEOWNERS` already existed on the base branch and was retained.

## Governance

Branching, review, and promotion rules are in the [Di Lucca branching policy](https://github.com/code-corhuila/ods-docs/blob/main/00-governance/branching-policy.md).
