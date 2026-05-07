# CI/CD Playbook

The delivery pipeline should make unsafe changes hard to merge and routine changes easy to verify.

## CI Gates

The GitHub Actions workflow runs on pull requests, pushes to `main`/`master`, and manual dispatch.

Required checks:

- install dependencies with `npm ci`
- validate Prisma schema
- apply migrations to PostgreSQL with pgvector
- run TypeScript typechecking
- run ESLint
- run unit tests
- run a production Next.js build
- audit production dependencies for high and critical advisories

Moderate advisories should still be triaged during dependency maintenance. Promote the audit threshold to moderate when the dependency tree has actionable fixes and the team is ready to block merges on that class of issue.

## Local Validation

Run this before opening a PR:

```bash
npm run validate
npm run build
```

If PowerShell blocks `npm.ps1`, use:

```bash
npm.cmd run validate
npm.cmd run build
```

## Branch Protection

Configure the GitHub repository with:

- pull requests required before merging
- CI required before merging
- stale approvals dismissed after new commits
- direct pushes to `main` blocked
- conversation resolution required
- CODEOWNERS review required for protected areas
- secret scanning and push protection enabled

## Environments

Use separate environments for:

- local development
- preview deployments
- staging, when the team needs production-like validation
- production

Each environment must have its own database and secrets. Do not point preview builds at production data.

## Database Deployments

Recommended production order:

1. Review migration SQL.
2. Backup production database or confirm managed backup recency.
3. Run `npm run db:deploy`.
4. Deploy application code.
5. Verify health checks and primary workflows.
6. Monitor logs and metrics.

For risky schema changes, use the safe change pattern in `DATABASE_PLAYBOOK.md`.

## Release Notes

Every production release should capture:

- user-facing changes
- migrations
- new environment variables
- security-sensitive changes
- operational risks
- rollback notes

## Rollback Rules

- Application rollbacks should be possible through the hosting provider.
- Database rollbacks should be planned per migration; do not assume a destructive migration can be automatically undone.
- For failed releases, preserve logs before redeploying.
