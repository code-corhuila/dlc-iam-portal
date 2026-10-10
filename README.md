# DLC IAM Portal

Angular 21 standalone preview for HU-IAM-001, based on the project scaffold.

## Current state

The portal shows a basic sign-in form and an MFA-pending state. `FakeIamApiService` accepts `staff@example.test` / `StrongPass1` and rejects other credentials; the UI displays a generic error. No backend or session is required. MFA completion and the Figma desktop layout remain pending. Brand assets will be added with the Figma layout.

CI runs `npm run check:skeleton`, `npm test`, and `npx ng run dlc-iam-portal:build-original:production`. The production entry deliberately blocks startup; the unit tests cover the development preview. Native Federation remains unverified. `federation.config.js` and the files in `deploy/` remain empty.

## Local verification

```bash
npm run check:skeleton
npm test
npx ng run dlc-iam-portal:build-original:production
npx ng run dlc-iam-portal:serve-original
```

These checks do not validate Native Federation, the Gateway, or the complete MFA and session flow.

## Future responsibilities

- `src/app/iam/components/`: sign-in and MFA forms.
- `src/app/iam/data/`: login port and temporary fake adapter. A future HTTP adapter must use the shared client from `dlc-front` and validate Gateway responses.
- `src/app/iam/model/`: types based on the IAM OpenAPI contract.
- `src/app/iam/pages/`: IAM pages.
- `src/app/iam/iam.routes.ts`: routes to expose through Native Federation.
- `src/app/shell-contract.ts`: integration contract with the shell.

`dlc-front` will own the session, shared HTTP client, and Gateway URL. The portal does not create or store sessions. `.github/CODEOWNERS` already existed on the base branch and was retained.

## Governance

Branching, review, and promotion rules are in the [Di Lucca branching policy](https://github.com/code-corhuila/ods-docs/blob/main/00-governance/branching-policy.md).
