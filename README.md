# OmniAI

OmniAI is a production-oriented foundation for a multi-model AI orchestration SaaS. It gives teams one workspace for conversations across multiple AI providers, with a recommendation layer that detects task intent before routing.

## Tech Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS with shadcn-style local UI primitives
- PostgreSQL with Prisma ORM
- NextAuth credentials foundation with OAuth-ready schema
- TOTP 2FA foundation with encrypted setup secrets and recovery codes
- Zod validation for API inputs
- Provider abstraction for OpenAI/ChatGPT, Anthropic Claude, Google Gemini, Mistral, Stability AI, and Amazon Bedrock
- Vitest for unit tests and Playwright-ready E2E configuration
- Docker Compose for local PostgreSQL with pgvector

## Setup

1. Install dependencies:

```bash
npm install --cache .npm-cache
```

2. Create a local environment file from `.env.example`:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Generate Prisma Client and run migrations:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

For an owner/admin account, set `ADMIN_EMAIL` and a generated `ADMIN_PASSWORD` before running `npm run db:seed`. The seed hashes the password and creates an owner workspace; no credentials are stored in the repository.

For production databases use:

```bash
npm run db:deploy
npm run db:seed
```

5. Run the app:

```bash
npm run dev
```

## Validation

```bash
npm run typecheck
npm run lint
npm test
```

## Environment

All secrets must be configured through environment variables. Do not commit `.env` files. Use `.env.example` as the contract for required values.

## Product Foundation

The scaffold includes:

- Signup/sign-in foundation
- Config-driven Google/GitHub OAuth login foundation
- Email verification flow with Resend transactional-email delivery hooks
- Forgot-password and password-reset flow with rate limits, audit logs, and transactional-email delivery hooks
- Multi-tenant workspace schema and authorization checks
- Workspace member listing, role management, pending invites, invite revocation, and secure invite acceptance
- Conversation and message storage
- Persistent chat history with selectable conversations
- Account profile, notification preferences, and sign-in security surfaces
- In-app notification bell and inbox for security, provider, workspace, usage, billing, and routing events
- Project workspaces with instructions, knowledge, conversations, and artifacts
- Global workspace search across conversations, messages, projects, knowledge, and artifacts
- Knowledge source ingestion for notes, URLs, and file text
- Automatic artifact capture for valuable generated outputs
- Server-side provider connection settings with encrypted workspace API keys
- Isolated provider adapters with live-call paths and safe no-key fallbacks
- Model registry with capability metadata
- Rule-based recommendation engine with transparent score breakdowns, designed for future LLM classification
- Manual, suggest, and auto routing foundation
- Memory/knowledge architecture prepared for vector search
- Usage by provider, model, request type, token estimate, and cost estimate
- Stripe checkout/customer portal routes, billing models, audit logs, and usage-limit enforcement

See `UX_FLOW.md`, `ROUTING_INTELLIGENCE.md`, `ARCHITECTURE.md`, `SECURITY.md`, `ENVIRONMENT.md`, `API.md`, and `DEPLOYMENT.md` for more detail.
