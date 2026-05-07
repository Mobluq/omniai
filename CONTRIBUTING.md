# Contributing

## Principles

- Keep route handlers thin.
- Put business logic in `src/modules`.
- Validate API input with Zod.
- Check workspace authorization before tenant-scoped reads and writes.
- Never expose provider secrets to the client.
- Add tests when changing recommendation, routing, registry, billing, or authorization behavior.

## Local Checks

Run before opening a pull request:

```bash
npm run validate
npm run build
```

`npm run validate` runs Prisma schema validation, TypeScript, ESLint, and unit tests.

## Branches and Pull Requests

- Use short, descriptive branch names.
- Use `codex/short-task-name` for Codex-authored work.
- Fill in the pull request template before requesting review.
- Call out database, security, deployment, and user-facing risks explicitly.
- Add an ADR under `docs/adr` for architectural decisions that affect future work.

## Adding a Provider

1. Create a provider adapter under `src/modules/ai/providers`.
2. Implement the shared `AIProvider` interface.
3. Register models in `src/modules/ai/registry/model-registry.ts`.
4. Update recommendation tests for new capabilities.
5. Keep provider-specific API details out of route handlers and UI components.

## Adding an API Route

1. Define or reuse a Zod schema.
2. Require authentication if the route is protected.
3. Check workspace authorization for tenant data.
4. Call a service module.
5. Return a consistent API envelope.

## Changing the Database

1. Update `prisma/schema.prisma`.
2. Create a named migration with `npm run db:migrate -- --name descriptive_change_name`.
3. Document destructive changes, backfills, deploy order, and rollback notes in the PR.
4. Run `npm run db:validate`.
5. Update `docs/foundation/DATABASE_PLAYBOOK.md` if the change establishes a new pattern.
