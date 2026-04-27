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

Provider keys can also be saved per workspace in Settings. Saved workspace keys are encrypted before storage and never returned to the browser.

Optional model overrides:

```bash
OPENAI_TEXT_MODEL="gpt-5-mini"
OPENAI_IMAGE_MODEL="gpt-image-1"
ANTHROPIC_MODEL="claude-sonnet-4-5"
GOOGLE_AI_MODEL="gemini-2.5-flash"
MISTRAL_MODEL="mistral-large-latest"
```

Amazon Bedrock uses AWS credentials or an AWS runtime role:

```bash
AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_SESSION_TOKEN=""
AWS_BEDROCK_MODEL_ID=""
```

For production, set a dedicated encryption key for saved provider credentials:

```bash
APP_ENCRYPTION_KEY="at-least-32-characters-generated-secret"
```

If `APP_ENCRYPTION_KEY` is not set, encryption falls back to `NEXTAUTH_SECRET`; production should use a separate stable key.

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
