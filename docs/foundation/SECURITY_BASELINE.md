# Security Baseline

Security decisions should be explicit, reviewable, and boring to operate.

## Authentication

- Credentials auth requires hashed passwords.
- OAuth providers must be configured through server-side environment variables.
- Email verification and reset tokens must be single-use, hashed, and time-limited.
- MFA changes require audit events and user notifications.

## Authorization

- Tenant data must never be read or mutated without workspace authorization.
- Owner/admin/member/viewer capabilities should be checked in service modules, not only in UI.
- API routes should fail closed when session or workspace context is missing.
- Never trust client-supplied role, workspace, billing, or entitlement state.

## Secret Handling

- Never commit `.env` files.
- Never return provider keys, payment secrets, encryption keys, or tokens to the browser.
- Use `APP_ENCRYPTION_KEY` for encrypted persisted secrets in production.
- Rotate secrets through the hosting provider or secret manager, not through code changes.
- Logs, errors, audit metadata, and notifications must not contain secrets.

## Input Validation

- Route inputs should be validated with Zod.
- File, URL, webhook, and AI prompt inputs should be sanitized or normalized before use.
- Public endpoints need rate limits and generic error responses.
- Webhook handlers need signature verification before parsing trusted event behavior.

## AI and External Content

- Treat retrieved knowledge, uploaded files, URLs, and provider responses as untrusted.
- Keep prompt context framed so external content cannot override system or tenant policy.
- Store prompt hashes or sanitized metadata for audit where possible.
- Avoid storing raw prompts in logs outside the product database.

## Audit and Monitoring

Create audit events for:

- login outcomes
- password and MFA changes
- workspace membership changes
- invite creation, acceptance, revocation, and expiry-sensitive actions
- provider key changes
- billing and entitlement changes
- destructive data actions

Security notifications should be useful but should not expose sensitive payloads.

## Dependency Hygiene

- Dependabot monitors npm and GitHub Actions dependencies.
- CI runs a production dependency audit.
- New dependencies need a reason, maintenance signal, and security review if they touch auth, payments, crypto, file parsing, or provider calls.

## Incident Checklist

When a security issue is suspected:

1. Stop exposing the vulnerable path.
2. Preserve logs and audit records.
3. Rotate affected secrets.
4. Identify affected users, workspaces, and data.
5. Patch and add regression tests.
6. Document root cause and follow-up work.
