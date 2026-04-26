# Security

## Secret Management

Provider keys, database credentials, Auth.js secrets, Stripe keys, and Sentry DSNs must come from environment variables. No provider key is exposed to the frontend.

## Authentication

The scaffold uses NextAuth credentials auth with an Auth.js-compatible Prisma schema. OAuth can be added through additional providers without changing the user/workspace model.

## Authorization and Tenant Isolation

Workspace access is checked through `assertWorkspaceAccess`. Workspace-scoped resources must always verify membership before read or write operations. Core tables include `workspaceId` where tenant isolation is required.

## API Validation

All route inputs use Zod schemas from `src/lib/validators/api-schemas.ts`. Route handlers return consistent success/error envelopes and do not leak internal errors.

## Rate Limiting

API routes include an in-memory rate limiter foundation. Production should replace this with Redis, Upstash, or another shared store so limits work across instances.

## API Key Handling

`AIProviderConfig` stores encrypted key material only. The current scaffold does not implement encryption. Before production, add envelope encryption using a managed KMS and store only ciphertext.

## Prompt Injection

The memory service sanitizes external text and wraps retrieved context as untrusted material. Production should add file-type-specific parsing, content provenance, allowlists, and policy checks before context injection.

## Secure Headers

`next.config.ts` sets baseline headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- restrictive `Permissions-Policy`

Add a strict Content Security Policy before production launch.

## CSRF

NextAuth protects its auth flows. For custom mutation endpoints, prefer same-site cookies, origin checks, and CSRF tokens for browser-submitted form flows.

## Audit Logs

Audit events are modeled for user, workspace, entity, action, IP address, user agent, and metadata. Sensitive payloads should not be placed in audit metadata.
