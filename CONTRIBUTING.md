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
npm run typecheck
npm run lint
npm test
```

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
