# Changelog

Notable changes to `dlc-iam-portal` are recorded here.

## [2.0.0] - 2026-10-13

### Added

- IAM browser module for composition by `dlc-front`, with a Docker image serving versioned static assets.
- Staff sign-in and MFA challenge states, password recovery and reset, and email verification screens.
- Staff directory, account creation, name editing, role assignment, enable, disable, and unlock flows through the shell HTTP contract.
- Own-session listing and revocation with explicit error and retry states.

### Changed

- Refined the desktop login and recovery layouts and the staff directory to match the approved designs.
- Opened staff registration in a centered modal with separate given-name and surname inputs. The two values are sent through the existing `name` contract.
- Made `npm run build` package the supported IAM browser module.

### Fixed

- Prevented duplicate requests and clarified conflict, expiry, rate-limit, and uncertain-result handling across IAM flows.
- Kept the login artwork filling the public frame down to the footer.

### Contract note

- Document number and mobile phone appear disabled in the registration modal because IAM has no persistence contract for them.
