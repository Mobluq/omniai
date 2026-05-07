# Naming Conventions

Names should explain the domain without forcing future engineers to open five files to understand the intent.

## Repository and Product

- Product names use clear title case in docs and UI.
- Package names use lowercase kebab case or compact lowercase names.
- Avoid temporary product names in database tables, environment variables, and public APIs unless the name is expected to survive launch.

## Files and Directories

- React components: `kebab-case.tsx`.
- Service modules: `kebab-case.ts`.
- Tests: `thing-being-tested.test.ts`.
- API route files follow Next.js conventions: `route.ts`.
- Documentation files use uppercase names only for root-level standards such as `README.md`, `SECURITY.md`, and `TEAM_HANDOFF.md`.

## TypeScript

- Classes: `PascalCase`.
- Types and interfaces: `PascalCase`.
- Functions and variables: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants or environment keys.
- Avoid abbreviations unless they are industry-standard.

## Domain Services

- Use names that describe the business capability: `WorkspaceService`, `BillingService`, `RoutingEngine`.
- Use `Engine` for deterministic decision systems.
- Use `Provider` for external platform adapters.
- Use `Repository` only if a dedicated data-access layer is introduced.

## Database

- Prisma models use singular `PascalCase`: `Workspace`, `UsageLog`, `AuditLog`.
- Enum values use lowercase snake case when they represent persisted product states.
- Foreign keys use `{modelName}Id`, for example `workspaceId`, `userId`, `conversationId`.
- Timestamp fields use `createdAt`, `updatedAt`, `deletedAt`, `archivedAt`, or a precise event name such as `acceptedAt`.
- Boolean fields should read naturally: `isEnabled`, `memoryEnabled`, `twoFactorEnabled`.

## API Routes

- Use nouns for resource routes: `/api/workspaces`, `/api/conversations`.
- Use action subroutes only for commands that are not clean resource updates: `/api/providers/test`, `/api/workspace-invites/accept`.
- Keep route params specific: `[workspaceId]`, `[conversationId]`, `[notificationId]`.

## Environment Variables

- Use `UPPER_SNAKE_CASE`.
- Server-only variables must not start with `NEXT_PUBLIC_`.
- Use provider prefixes for external secrets: `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`.
- Add every supported variable to `.env.example` and `ENVIRONMENT.md`.

## Branches and Commits

- Feature branches: `codex/short-task-name` for Codex-authored work, otherwise `feature/short-task-name`.
- Fix branches: `fix/short-issue-name`.
- Chore branches: `chore/short-maintenance-name`.
- Commit messages should start with a verb and name the outcome: `Add workspace invite audit trail`.
