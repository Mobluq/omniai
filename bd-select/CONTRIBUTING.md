# Contributing

## Principles

- Keep route handlers thin.
- Put business logic in `src/modules`.
- Put shared infrastructure in `src/lib`.
- Validate API input.
- Check user role, ownership, and marketplace-state authorization before protected reads and writes.
- Never expose secrets to the client.
- Add tests when changing authorization, payments, escrow, security, integrations, or database behavior.

## Local Checks

```bash
npm run validate
npm run build
```

## Branches and Pull Requests

- Use short descriptive branch names.
- Use `codex/short-task-name` for Codex-authored work.
- Fill in the pull request template before requesting review.
- Call out database, security, deployment, and user-facing risks.
- Add an ADR under `docs/adr` for decisions that affect future work.

## Changing the Database

1. Update `prisma/schema.prisma`.
2. Create a named migration with `npm run db:migrate -- --name descriptive_change_name`.
3. Document destructive changes, backfills, deploy order, and rollback notes.
4. Run `npm run db:validate`.
