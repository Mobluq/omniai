# Environment

Create `.env` from `.env.example`. Never commit `.env`.

## Required for local development

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/omniai?schema=public"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
```

Generate a local secret with:

```bash
openssl rand -base64 32
```

## Optional provider keys

```bash
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_AI_API_KEY=""
MISTRAL_API_KEY=""
STABILITY_API_KEY=""
```

Provider adapters currently return safe placeholders. Add live API calls only inside the provider adapter modules.

## Billing and observability

```bash
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
SENTRY_DSN=""
```

Production deployments should configure these through the hosting provider secret manager.

## Admin bootstrap

Seeded admin credentials are environment-driven and must never be committed:

```bash
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="use-a-generated-password-with-at-least-16-characters"
ADMIN_NAME="OmniAI Admin"
ADMIN_WORKSPACE_NAME="OmniAI Admin Workspace"
```

Run `npm run db:seed` after migrations. The seed creates or updates the admin user and grants `owner` access to an admin workspace.

## Signup policy

Production defaults to invite-only if `SIGNUP_MODE` is not set:

```bash
SIGNUP_MODE="invite"
SIGNUP_INVITE_CODE="generated-private-code"
```

Use `SIGNUP_MODE="public"` only when email verification, abuse controls, and billing limits are ready.
