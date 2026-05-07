# Security

## Secret Management

All database credentials, auth secrets, encryption keys, integration secrets, payment secrets, and observability DSNs must come from environment variables or the hosting provider secret manager.

Never commit `.env` files. Never return secrets to the browser.

## Authentication

BD Select includes Auth.js-compatible database models and a seeded admin pattern. Product teams should add the required auth flows for email OTP, phone OTP, OAuth, admin MFA, and account lifecycle requirements.

## Authorization

Marketplace resources must verify ownership, role, KYC status, and workflow state before read or write operations. Role checks belong in service modules and API handlers, not only in UI.

## API Validation

Route inputs should be validated before service calls. Public endpoints should use rate limits and generic error responses.

## Encryption

Use `APP_ENCRYPTION_KEY` for encrypted persisted secrets in production. Keep it stable and separate from session secrets.

## Audit Logs

Audit events should not include secrets, raw tokens, payment secrets, raw KYC payloads, or sensitive evidence. Create audit records for account, KYC, listing review, payment, payout, dispute, ban, integration, and destructive data changes.

## Baseline

Team security expectations are documented in `docs/foundation/SECURITY_BASELINE.md`.
