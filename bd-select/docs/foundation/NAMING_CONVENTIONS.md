# Naming Conventions

Names should communicate purpose without forcing a future engineer to inspect unrelated files.

## Files and Directories

- React components: `kebab-case.tsx`.
- Services and helpers: `kebab-case.ts`.
- Tests: `thing-being-tested.test.ts`.
- API route files follow Next.js conventions: `route.ts`.
- Root-level standards use uppercase names: `README.md`, `SECURITY.md`, `TEAM_HANDOFF.md`.

## TypeScript

- Classes: `PascalCase`.
- Types and interfaces: `PascalCase`.
- Functions and variables: `camelCase`.
- Environment keys and true constants: `UPPER_SNAKE_CASE`.
- Avoid abbreviations unless they are industry-standard.

## Database

- Prisma models use singular `PascalCase`.
- Persisted enum values use lowercase snake case where possible.
- Foreign keys use `{modelName}Id`: `userId`, `sellerId`, `buyerId`, `listingId`, `orderId`.
- Timestamps use `createdAt`, `updatedAt`, `deletedAt`, `archivedAt`, or a precise event name.
- Boolean fields should read naturally: `isEnabled`, `emailVerified`, `twoFactorEnabled`.

## API Routes

- Use nouns for resources: `/api/listings`, `/api/orders`, `/api/notifications`.
- Use action routes only for commands that are not clean resource updates.
- Keep route params specific: `[listingId]`, `[orderId]`, `[notificationId]`.

## Branches and Commits

- Codex-authored work: `codex/short-task-name`.
- Feature work: `feature/short-task-name`.
- Fixes: `fix/short-issue-name`.
- Chores: `chore/short-maintenance-name`.
- Commit messages should start with a verb and name the outcome.
