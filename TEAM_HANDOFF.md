# Team Handoff

This repository is intentionally set up as a long-term product foundation. Until the final product brief is known, the team should treat the existing OmniAI implementation as the engineering baseline: modular service boundaries, documented workflows, strict validation, tenant-aware data modeling, and security-first defaults.

## Start Here

1. Read `README.md` for product and setup context.
2. Read `docs/foundation/ENGINEERING_BASELINE.md` before changing code.
3. Read `docs/foundation/DATABASE_PLAYBOOK.md` before changing Prisma models or migrations.
4. Read `docs/foundation/SECURITY_BASELINE.md` before touching auth, tenant data, secrets, AI payloads, or billing.
5. Read `docs/foundation/CI_CD_PLAYBOOK.md` before changing workflows or deployment behavior.
6. Use `docs/foundation/PRODUCT_BRIEF_TEMPLATE.md` when the real project brief is ready.

## Repository Expectations

- Route handlers stay thin; business behavior belongs in `src/modules`.
- Shared infrastructure belongs in `src/lib`.
- UI should use existing primitives under `src/components/ui` before adding new component patterns.
- Database changes require a Prisma migration, a documented rollback plan, and focused tests.
- Security-sensitive changes require explicit notes in the pull request.
- Important architectural decisions require an ADR under `docs/adr`.

## Local Validation

Run these before opening a pull request:

```bash
npm run validate
npm run build
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`:

```bash
npm.cmd run validate
npm.cmd run build
```

## Current CI Standard

GitHub Actions validates:

- dependency installation through `npm ci`
- Prisma schema validity
- production migrations against PostgreSQL with pgvector
- TypeScript typechecking
- ESLint
- unit tests
- production Next.js build
- production dependency audit

## Before Product Buildout

Do not start feature implementation until the product brief captures:

- primary users and workflows
- account and tenant model
- data sensitivity and retention needs
- integrations and external systems
- billing or commercial model
- non-functional requirements
- launch, support, and incident expectations

Use `docs/foundation/PRODUCT_BRIEF_TEMPLATE.md` as the intake contract.
