# Database Playbook

Treat the database as a product contract.

## Current Standard

- PostgreSQL is the source of truth.
- Prisma owns schema definition and migrations.
- Marketplace records carry explicit ownership fields such as `userId`, `sellerId`, `buyerId`, `actorId`, `orderId`, `listingId`, or `barterProposalId`.
- Money, KYC, review, dispute, and admin records must be traceable through immutable workflow state and audit logs.
- Secrets are encrypted, hashed, or never stored.

## Modeling Rules

- Model ownership and workflow boundaries first.
- Prefer explicit join models when relationships have roles, status, timestamps, or audit meaning.
- Add `createdAt` and `updatedAt` to durable business records.
- Use recoverable lifecycle fields such as `archivedAt` where appropriate.
- Use hard deletes only when privacy, lifecycle, and audit needs are clear.
- Add indexes for foreign keys, lookup fields, slugs, and common filters.
- Keep JSON fields for metadata, not primary workflow state.

## Migration Rules

Use named migrations:

```bash
npm run db:migrate -- --name add_listing_review_sla
```

Every migration PR should document:

- why the change exists
- whether it is additive, destructive, or backfilled
- expected production runtime
- rollback strategy
- deploy ordering constraints

## Safe Change Pattern

1. Add nullable columns or new tables.
2. Deploy code that can read old and new shapes.
3. Backfill data.
4. Enforce non-null or uniqueness constraints.
5. Remove old fields only after production confirms no reads remain.

## Review Checklist

- Is ownership and workflow authorization enforced?
- Are destructive changes staged?
- Are indexes aligned with queries?
- Are uniqueness constraints scoped correctly?
- Are secrets encrypted or hashed?
- Are audit events needed?
- Are retention and deletion rules clear?
