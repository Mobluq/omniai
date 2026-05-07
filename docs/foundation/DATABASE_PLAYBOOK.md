# Database Playbook

The database is part of the product contract. Treat schema changes as carefully as API changes.

## Current Standard

- PostgreSQL is the source of truth.
- Prisma owns schema definition and migrations.
- IDs use `cuid()` unless a future ADR changes the identifier strategy.
- Tenant-owned records carry `workspaceId`.
- User-owned records carry `userId` when ownership or audit trails matter.
- Sensitive values are encrypted or hashed before storage.

## Modeling Rules

- Model tenant boundaries first.
- Prefer explicit join models when the relationship has roles, status, timestamps, or audit meaning.
- Add `createdAt` and `updatedAt` to durable business records.
- Use `archivedAt` or status fields for recoverable product states.
- Use hard deletes only when lifecycle, privacy, and audit needs are clear.
- Add indexes for foreign keys, slugs, lookup fields, and common filters.
- Keep JSON fields for flexible metadata, not primary workflow state.

## Tenant Isolation

Any table containing workspace data must include one of:

- a direct `workspaceId`
- a required parent relation that enforces workspace access before use
- a written explanation in the PR for why the record is global

Service methods must check workspace access before reading or mutating tenant-scoped data.

## Migration Rules

Use descriptive timestamped migration names:

```bash
npm run db:migrate -- --name add_workspace_billing_limits
```

Each migration PR should document:

- why the change exists
- whether it is additive, destructive, or backfilled
- expected production runtime
- rollback strategy
- any deploy ordering constraints

## Safe Change Pattern

For high-risk tables, prefer this sequence:

1. Add nullable columns or new tables.
2. Deploy application code that can read old and new shapes.
3. Backfill data.
4. Enforce non-null or uniqueness constraints.
5. Remove old fields only after production confirms no reads remain.

## Seed Rules

- Seeds may create local/demo/admin bootstrap data.
- Seeds must not include real credentials.
- Seeds should be idempotent.
- Production seed behavior must be environment-driven and documented.

## Data Classification

Before adding a field, classify it:

- public: safe to expose
- internal: visible to authenticated team members
- confidential: tenant-owned and access-controlled
- secret: encrypted, hashed, or never stored
- regulated: requires product/legal review before storage

## Review Checklist

- Does every tenant-scoped record enforce workspace access?
- Are destructive changes avoided or staged?
- Are indexes aligned with query patterns?
- Are uniqueness constraints scoped correctly?
- Are secrets encrypted or hashed?
- Are audit events needed?
- Are retention and deletion requirements clear?
