# 0002. Use a Modular Next.js Marketplace Baseline

Status: Accepted

## Context

BD Select needs a foundation that supports authenticated users, KYC, marketplace records, database-backed workflows, API routes, and production deployment.

## Decision

The project starts as a modular Next.js application:

- UI and route handlers live in `src/app`.
- Business capabilities live in `src/modules`.
- Shared infrastructure lives in `src/lib`.
- PostgreSQL and Prisma provide persistence.

## Consequences

- The team can ship without premature service boundaries.
- Domain modules can later be extracted if traffic or ownership requires it.
- Route handlers must stay thin so business logic remains testable.
