# Security

## Secret Management

Provider keys, database credentials, Auth.js secrets, Stripe keys, and Sentry DSNs must come from environment variables. No provider key is exposed to the frontend.

## Authentication

The scaffold uses NextAuth credentials auth with an Auth.js-compatible Prisma schema. OAuth can be added through additional providers without changing the user/workspace model.

Credentials login is protected by database-backed throttling keyed by email and client IP. Failed and successful login attempts are recorded in the audit log with hashed email metadata so investigations do not require storing raw attempted addresses.

Public signup is controlled by `SIGNUP_MODE`. Production defaults to invite-only and requires `SIGNUP_INVITE_CODE` unless signup is explicitly disabled or opened.

## Authorization and Tenant Isolation

Workspace access is checked through `assertWorkspaceAccess`. Workspace-scoped resources must always verify membership before read or write operations. Core tables include `workspaceId` where tenant isolation is required.

## API Validation

All route inputs use Zod schemas from `src/lib/validators/api-schemas.ts`. Route handlers return consistent success/error envelopes and do not leak internal errors.

## Rate Limiting

API routes use a database-backed limiter in the `RateLimitBucket` table. It stores hashed keys, supports temporary blocking, and runs updates inside serializable transactions so limits work across serverless instances. High-volume production installs can later swap the implementation for Redis, Upstash, or Vercel KV behind the same `assertRateLimit` interface.

## API Key Handling

`AIProviderConfig` stores encrypted key material only. Workspace provider keys are encrypted with AES-256-GCM using `APP_ENCRYPTION_KEY` or, as a local fallback, `NEXTAUTH_SECRET`. Production should keep `APP_ENCRYPTION_KEY` stable and separate from session secrets; larger deployments should move this to managed KMS envelope encryption.

## Prompt Injection

The memory service sanitizes external text and wraps retrieved context as untrusted material. Production should add file-type-specific parsing, content provenance, allowlists, and policy checks before context injection.

## Secure Headers

`next.config.ts` sets baseline headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- restrictive `Permissions-Policy`
- `Content-Security-Policy`

## CSRF

NextAuth protects its auth flows. For custom mutation endpoints, prefer same-site cookies, origin checks, and CSRF tokens for browser-submitted form flows.

## Audit Logs

Audit events are modeled for user, workspace, entity, action, IP address, user agent, and metadata. Sensitive payloads should not be placed in audit metadata.
