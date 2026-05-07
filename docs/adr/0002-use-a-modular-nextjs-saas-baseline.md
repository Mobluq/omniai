# 0002. Use a Modular Next.js SaaS Baseline

Status: Accepted

## Context

The final product brief is not known yet, but the team needs a foundation that supports authenticated users, workspaces, database-backed workflows, API routes, and production deployment.

## Decision

The project will start as a modular Next.js application:

- UI and route handlers live in `src/app`.
- Business capabilities live in `src/modules`.
- Shared infrastructure lives in `src/lib`.
- PostgreSQL and Prisma provide the persistence layer.

## Consequences

- The team can ship quickly without introducing premature service boundaries.
- Domain modules can later be extracted if traffic or ownership requires it.
- Route handlers must stay thin so business logic remains testable.
