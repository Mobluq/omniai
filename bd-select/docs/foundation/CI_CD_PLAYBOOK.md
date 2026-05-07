# CI/CD Playbook

The delivery pipeline should make unsafe changes hard to merge and normal changes easy to verify.

## CI Gates

GitHub Actions runs on pull requests, pushes to `main`/`master`, and manual dispatch.

Required checks:

- install dependencies with `npm ci`
- validate Prisma schema
- apply migrations to PostgreSQL with pgvector
- typecheck
- lint
- run unit tests
- build production Next.js output
- audit production dependencies for high and critical advisories

## Local Validation

```bash
npm run validate
npm run build
```

## Branch Protection

Configure GitHub with:

- pull requests required before merging
- CI required before merging
- stale approvals dismissed after new commits
- direct pushes to `main` blocked
- conversation resolution required
- CODEOWNERS review for protected areas
- secret scanning and push protection enabled

## Environments

Use separate databases and secrets for:

- local development
- preview deployments
- staging
- production

Preview builds must not point at production data.

## Deployment Order

1. Review migration SQL.
2. Confirm backup recency.
3. Run `npm run db:deploy`.
4. Deploy application code.
5. Verify health checks and primary workflows.
6. Monitor logs and metrics.
