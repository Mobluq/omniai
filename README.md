# OmniAI

OmniAI is a production-oriented foundation for a multi-model AI orchestration SaaS. It gives teams one workspace for conversations across multiple AI providers, with a recommendation layer that detects task intent before routing.

## Tech Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS with shadcn-style local UI primitives
- PostgreSQL with Prisma ORM
- NextAuth credentials foundation with OAuth-ready schema
- Zod validation for API inputs
- Provider abstraction for OpenAI, Anthropic, Google Gemini, Stability AI, and Mistral
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
- Multi-tenant workspace schema and authorization checks
- Conversation and message storage
- Provider abstraction and isolated provider adapters
- Model registry with capability metadata
- Rule-based recommendation engine designed for future LLM classification
- Manual, suggest, and auto routing foundation
- Memory/knowledge architecture prepared for vector search
- Usage logs, billing models, audit logs, and settings structure

See `ARCHITECTURE.md`, `SECURITY.md`, `ENVIRONMENT.md`, `API.md`, and `DEPLOYMENT.md` for more detail.
