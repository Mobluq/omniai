# Handoff Checklist

## First Hour

- [ ] Read `TEAM_HANDOFF.md`.
- [ ] Read `README.md`.
- [ ] Install dependencies.
- [ ] Create `.env` from `.env.example`.
- [ ] Start PostgreSQL with `docker compose up -d`.
- [ ] Run `npm run db:generate`.
- [ ] Run `npm run db:migrate`.
- [ ] Run `npm run validate`.

## Before Feature Work

- [ ] Fill in the product brief.
- [ ] Confirm user roles, ownership boundaries, KYC gates, and workflow state rules.
- [ ] Identify sensitive data.
- [ ] Identify new environment variables.
- [ ] Identify database migrations.
- [ ] Identify audit events.
- [ ] Identify tests and manual validation.

## Before Production Launch

- [ ] Production secrets are configured outside the repo.
- [ ] `APP_ENCRYPTION_KEY` is set and stable.
- [ ] Signup mode is deliberate.
- [ ] Migrations have been deployed.
- [ ] Admin bootstrap is complete.
- [ ] Branch protection is enabled.
- [ ] Monitoring and incident response ownership are assigned.
