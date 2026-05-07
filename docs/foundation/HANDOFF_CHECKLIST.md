# Handoff Checklist

Use this when a new engineer joins, a new project phase starts, or the final product brief is ready.

## First Hour

- [ ] Read `TEAM_HANDOFF.md`.
- [ ] Read `README.md`.
- [ ] Install dependencies with `npm install --cache .npm-cache`.
- [ ] Create `.env` from `.env.example`.
- [ ] Start PostgreSQL with `docker compose up -d`.
- [ ] Run `npm run db:generate`.
- [ ] Run `npm run db:migrate`.
- [ ] Run `npm run db:seed` if admin seed variables are configured.
- [ ] Run `npm run validate`.

## Before Feature Work

- [ ] Fill in or update `PRODUCT_BRIEF_TEMPLATE.md`.
- [ ] Confirm user roles and tenant boundaries.
- [ ] Identify sensitive data.
- [ ] Identify new environment variables.
- [ ] Identify database migrations.
- [ ] Identify needed audit events.
- [ ] Identify tests and manual validation.

## Before Opening a PR

- [ ] Keep route handlers thin.
- [ ] Keep business logic in modules.
- [ ] Validate API inputs.
- [ ] Enforce workspace authorization.
- [ ] Add or update migrations.
- [ ] Update docs for setup, security, API, or workflow changes.
- [ ] Run local validation.
- [ ] Complete the PR template.

## Before Production Launch

- [ ] Production secrets are configured outside the repo.
- [ ] `APP_ENCRYPTION_KEY` is set and stable.
- [ ] Signup mode is deliberate.
- [ ] Email delivery is configured.
- [ ] Billing/webhook secrets are configured if billing is enabled.
- [ ] Migrations have been deployed.
- [ ] Admin bootstrap is complete.
- [ ] Branch protection is enabled.
- [ ] Monitoring and incident response ownership are assigned.
