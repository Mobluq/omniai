# Security Baseline

Security decisions should be explicit, reviewable, and operationally simple.

## Authentication

- Store passwords only as strong hashes.
- Configure OAuth and session secrets through server-side environment variables.
- Email verification and reset tokens must be single-use, hashed, and time-limited.
- MFA and password changes should create audit events.

## Authorization

- Marketplace data must never be read or mutated without role, ownership, KYC, and workflow-state authorization.
- Role checks belong in service modules, not only UI.
- API routes fail closed when required session, role, ownership, or workflow context is missing.
- Never trust client-supplied role, entitlement, payment, KYC, or order state.

## Secret Handling

- Never commit `.env`.
- Never return secrets to the browser.
- Use `APP_ENCRYPTION_KEY` for encrypted persisted secrets in production.
- Logs, audit metadata, errors, and notifications must not contain secrets.

## Input Validation

- Validate route inputs.
- Sanitize file, URL, webhook, and prompt inputs before use.
- Rate-limit public endpoints.
- Verify webhook signatures before trusting event payloads.

## Audit Events

Create audit events for:

- login outcomes
- password and MFA changes
- role, KYC, and account lifecycle changes
- invite lifecycle events
- provider or integration key changes
- payment, payout, escrow, subscription, and promotion changes
- listing review, dispute, ban, and refund decisions
- destructive data actions

## Dependency Hygiene

- Dependabot monitors npm and GitHub Actions.
- CI blocks high and critical production dependency advisories.
- New dependencies need a reason and extra review if they touch auth, payments, crypto, file parsing, or external API calls.
