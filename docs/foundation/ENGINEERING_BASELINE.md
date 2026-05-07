# Engineering Baseline

This is the default engineering contract for the repository until a more specific project architecture is approved through an ADR.

## Principles

- Keep code easy for another engineer to resume.
- Prefer explicit domain services over logic hidden in route handlers or components.
- Make security, tenant boundaries, and auditability visible in code review.
- Keep database migrations small, named, and reversible by a documented operational plan.
- Document decisions when they affect future direction, not after the team forgets why the choice was made.

## Application Structure

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: reusable UI and feature components.
- `src/modules`: domain services and business rules.
- `src/lib`: shared infrastructure such as auth, database, security, validation, logging, and errors.
- `src/types`: shared TypeScript declarations.
- `prisma`: database schema, migrations, and seed scripts.
- `tests`: unit and end-to-end test entry points.
- `docs`: long-lived documentation and ADRs.

## Module Rules

- Create one module per business capability.
- Keep module names singular or capability-based: `workspace`, `billing`, `conversation`, `notification`.
- Expose behavior through service classes or focused functions.
- Do not import UI code into `src/modules`.
- Do not import provider SDKs directly into route handlers.
- Keep third-party API details behind adapter boundaries.

## API Route Rules

Every protected API route should follow this order:

1. Parse and validate input with Zod.
2. Require authentication.
3. Check workspace or resource authorization.
4. Call a service module.
5. Return the standard API success/error envelope.
6. Avoid leaking raw internal errors.

## UI Rules

- Use local primitives in `src/components/ui` before adding a new UI dependency.
- Keep data fetching and mutation behavior close to feature components, but keep business rules server-side.
- Avoid client-side access to secrets, provider credentials, billing secrets, or raw tenant data from other workspaces.
- Prefer clear empty, loading, error, and success states for every long-term feature.

## Testing Standard

- Recommendation, routing, authorization, billing, security, and database behavior need focused unit tests.
- API changes need tests for validation failures and authorization failures.
- Database changes need tests or seed coverage for new required relationships.
- UI-only changes should include a short manual validation note in the PR when automated coverage is not practical.

## Documentation Standard

Add or update documentation when a change affects:

- setup or environment variables
- database structure or migrations
- security posture
- deployment behavior
- public API behavior
- user workflows
- team conventions

## Pull Request Standard

A PR is not ready until:

- the PR template is filled in
- migrations are called out
- security-sensitive behavior is identified
- validation commands are listed
- related documentation is updated
- reviewers can understand the intent without reading every changed line first
