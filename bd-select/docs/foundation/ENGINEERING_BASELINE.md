# Engineering Baseline

This is the engineering contract for BD Select until a more specific project architecture is accepted through an ADR.

## Principles

- Keep the codebase easy for another engineer to resume.
- Prefer explicit domain services over logic hidden in route handlers or components.
- Make ownership boundaries, security decisions, money movement, and auditability visible in code review.
- Keep database migrations small, named, and reviewable.
- Document decisions when they affect future direction.

## Structure

- `src/app`: Next.js pages and API routes.
- `src/components`: reusable UI and feature components.
- `src/modules`: domain services and business rules.
- `src/lib`: shared infrastructure such as database, security, validation, errors, logging, and naming.
- `prisma`: schema, migrations, and seed scripts.
- `tests`: focused unit and integration tests.
- `docs`: handoff documentation and ADRs.

## API Route Rules

1. Validate input.
2. Require authentication if protected.
3. Check role, ownership, KYC, and resource-state authorization.
4. Call a domain service.
5. Return the standard API envelope.
6. Avoid leaking internal errors.

## Testing Standard

- Authorization, payments, escrow, security, routing, integration, and database behavior need focused tests.
- API routes need validation and authorization failure coverage.
- Database changes need migration validation and tests or seed coverage.
- UI-only changes need manual validation notes when automated coverage is not practical.

## Pull Request Standard

- Fill in the PR template.
- Call out migration, security, deployment, and user-facing risks.
- Add docs for setup, API, workflow, deployment, or security changes.
- Add an ADR for decisions that shape future work.
