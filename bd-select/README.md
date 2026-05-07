# BD Select

BD Select is an authenticated resale marketplace for premium fashion and accessories, built for Nigeria first and Africa next. The foundation is designed around curated supply, listing authentication, escrowed payments, logistics, disputes, seller reputation, Pro sellers, promoted listings, and barter.

This repository is not a finished marketplace yet. It is the long-term engineering base your team can pick up from without redoing naming, CI/CD, security defaults, documentation, or database structure.

## What Is Included

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Prisma and PostgreSQL with a BD Select marketplace schema
- NextAuth-compatible account, session, and verification-token tables
- Core domain tables for users, seller profiles, KYC, brands, categories, listings, photos, authentication review, orders, payments, payouts, shipments, disputes, messages, reviews, barter, promotions, notifications, audit logs, and rate limits
- Server-only environment validation with Zod
- API response helpers and security helpers for hashing, redaction, encryption, and request sanitization
- GitHub Actions CI with PostgreSQL migration deploy validation
- Dependabot, CODEOWNERS, PR template, and issue templates
- Product, architecture, database, security, CI/CD, and handoff documentation

## Product Rule

Call the product `BD Select` everywhere. The supplied source material used an earlier working name; this codebase should not use that name for product, package, database, app, or documentation naming.

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

On Windows PowerShell, use `npm.cmd` if local script execution policy blocks `npm.ps1`.

For local product demo data:

```bash
$env:SEED_DEMO_DATA="true"
npm.cmd run db:seed
npm.cmd run dev
```

Then open `/console`.

For the local onboarding flow, open `/onboarding`. Development OTP is `000000`.

For seller listing creation, open `/sell/new` after seeding demo users.

## Validation

```bash
npm run validate
npm run build
```

`npm run validate` runs Prisma schema validation, TypeScript, ESLint, and unit tests. CI also applies migrations against PostgreSQL before typecheck, lint, tests, build, and production dependency audit.

## Documentation

Start with:

- `TEAM_HANDOFF.md`
- `docs/product/PRODUCT_BRIEF.md`
- `docs/product/PRD.md`
- `docs/product/DATABASE_MODEL.md`
- `docs/product/API_SPINE.md`
- `docs/product/ROADMAP_AND_METRICS.md`
- `docs/product/SECURITY_AND_COMPLIANCE.md`
- `docs/product/SOURCE_REVIEW_NOTES.md`
- `docs/foundation/ENGINEERING_BASELINE.md`
- `docs/foundation/DATABASE_PLAYBOOK.md`
- `docs/foundation/SECURITY_BASELINE.md`
- `docs/foundation/CI_CD_PLAYBOOK.md`

## Build Discipline

Feature work should map back to a documented product requirement, database entity, security note, and acceptance test. Marketplace flows involving money, KYC, PII, authentication, disputes, or admin action require audit logging and explicit rollback notes in the pull request.
