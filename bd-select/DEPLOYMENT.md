# BD Select Deployment Runbook

## Requirements

- GitHub repository
- Hosting project configured for Next.js
- Hosted PostgreSQL database
- Production environment variables
- Applied Prisma migrations
- Seeded admin account when needed

## Required Environment Variables

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="long-random-production-secret"
NEXTAUTH_URL="https://your-domain.example"
APP_URL="https://your-domain.example"
APP_ENCRYPTION_KEY="long-random-stable-encryption-key"
PAYSTACK_SECRET_KEY=""
PAYSTACK_WEBHOOK_SECRET=""
FLUTTERWAVE_SECRET_KEY=""
FLUTTERWAVE_WEBHOOK_SECRET=""
```

## Database Migration

Run against the hosted database:

```bash
npm run db:deploy
```

Run seed only when the environment variables intentionally define a bootstrap admin:

```bash
npm run db:seed
```

## Production Checklist

- GitHub repository exists and branch protection is enabled.
- CI is required before merging.
- Dependabot is enabled.
- Environment variables are configured for preview and production.
- Hosted PostgreSQL is reachable from the app runtime.
- Migrations have completed successfully.
- `APP_ENCRYPTION_KEY` is configured and stable.
- Signup mode is deliberate.
- `/api/health` is verified after deployment.

See `docs/foundation/CI_CD_PLAYBOOK.md` for release and rollback standards.
