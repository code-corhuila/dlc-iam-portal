# DLC IAM Portal

Angular 21 IAM portal with a standalone HU-IAM-001 development preview, a browser-module entry for `dlc-front`, and HU-IAM-004 password-recovery and reset screens.

## Current state

The standalone development preview uses `FakeIamApiService` with `staff@example.test` / `StrongPass1`; it does not contact Auth or establish a session. The preview includes the Di Lucca header and footer. Its login form shows a generic error, and its MFA challenge stays in memory until expiry, restart, or unmount. Auth remains responsible for enforcing challenge expiry and single use.

The separate `entry.js` module implements the v1 `mount`/`updateRoute`/`canLeave`/`unmount` boundary. It receives HTTP from `dlc-front`, validates the Auth login challenge, and never creates a session. The `/recover-password` route sends a recovery request through that same capability and displays a generic acknowledgement without revealing account existence. `/recover-password/reset` accepts a manually entered recovery token and new password without putting the token in the URL; Auth validates and consumes the token, changes the password, and revokes sessions. `/recover-password/verify-email` accepts a manually entered verification token without putting it in the URL; Auth validates and consumes it. `/app/administration` lists, reads, creates, edits names and roles, and requests staff disabling and enabling through Auth, with loading and denied/failure states. Name edits send the record version to detect conflicts; email and status are not writable through that form. Role edits send allowed roles, a reason, and the record version; Auth enforces Administrator authorization, auditing, and session revocation. Disabling and enabling send a reason, expected version, and idempotency key; Auth enforces authorization, audit, account checks, and session revocation. Enabling does not restore revoked sessions, and an unverified account remains pending verification. Creation is limited to Dentist or Secretary Assistant and starts in pending verification; Auth enforces Administrator authorization. Unknown IAM local routes display a local 404. The shell compositor and its HTTP capability are not yet running together with this module, so live Gateway and Docker acceptance remain pending. MFA proof submission remains pending.

An isolated own-sessions screen uses shell HTTP to list sessions and request device revocation through Auth with an idempotency key. It handles denied, expired, conflict and uncertain outcomes without creating a second session store. Route wiring remains for a later increment; this screen is not yet reachable from `entry.js`.

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

- `src/app/iam/components/`: sign-in, password-recovery request and reset, and email-verification forms; MFA completion remains pending.
- `src/app/iam/data/`: IAM API port, development-only fake adapter, and shell HTTP adapter.
- `src/app/iam/model/`: types based on the IAM OpenAPI contract.
- `src/app/iam/pages/`: IAM pages.
- `src/portal-entry.ts`: browser-module lifecycle for the compositor.
- `src/app/shell-contract.ts`: framework-neutral integration types.

`dlc-front` owns the browser session, shared HTTP client, and Gateway URL. The portal does not create or store sessions. `.github/CODEOWNERS` already existed on the base branch and was retained.

## Governance

Branching, review, and promotion rules are in the [Di Lucca branching policy](https://github.com/code-corhuila/ods-docs/blob/main/00-governance/branching-policy.md).
