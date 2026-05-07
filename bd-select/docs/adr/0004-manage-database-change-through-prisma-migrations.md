# 0004. Manage Database Change Through Prisma Migrations

Status: Accepted

## Context

The project uses PostgreSQL with Prisma. Long-term development needs reproducible schema changes, reviewable SQL, and a clear production migration path.

## Decision

Database changes will be managed through Prisma schema updates and committed migrations. Production deploys use `prisma migrate deploy` through `npm run db:deploy`.

## Consequences

- Schema changes are versioned with application code.
- CI can validate migrations against PostgreSQL.
- Destructive changes require explicit review and rollback notes.
