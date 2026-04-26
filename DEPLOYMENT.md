# Deployment Runbook

## Current deployment requirements

OmniAI needs:

- A GitHub repository connected to Vercel
- A Vercel project using the Next.js framework preset
- A hosted PostgreSQL database with pgvector enabled
- Production environment variables configured in Vercel
- Prisma migrations applied before real traffic
- Seeded admin owner account created from secure environment variables

## GitHub

This workspace must be pushed to a GitHub repository before Git-based Vercel deployments can run.

```bash
git init
git add .
git commit -m "Build OmniAI SaaS foundation"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/omniai.git
git push -u origin main
```

Do not commit `.env` or any production secrets.

## Vercel project

1. Create a new Vercel project from the GitHub repository.
2. Use the default Next.js framework preset.
3. Set the build command to `npm run build`.
4. Set the install command to `npm install`.
5. Configure environment variables before production use.

## Required Vercel environment variables

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="long-random-production-secret"
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
APP_URL="https://your-vercel-domain.vercel.app"
```

## Optional provider and platform variables

```bash
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_AI_API_KEY=""
MISTRAL_API_KEY=""
STABILITY_API_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
SENTRY_DSN=""
```

## Admin owner account

Create the first owner account through seed variables:

```bash
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="generated-password-at-least-16-characters"
ADMIN_NAME="OmniAI Admin"
ADMIN_WORKSPACE_NAME="OmniAI Admin Workspace"
```

The password is hashed by the seed script. Do not store real credentials in the repository.

## Database migration and seed

Run against the hosted database:

```bash
npm run db:deploy
npm run db:seed
```

For Vercel, run these from a secure local terminal or CI job with the same production `DATABASE_URL`.

## Production checklist

- GitHub repository exists and is private until launch.
- Vercel environment variables are configured for production and preview.
- Hosted PostgreSQL is reachable from Vercel.
- `npm run db:deploy` has completed successfully.
- `npm run db:seed` has created the owner account.
- Provider API keys are configured only as server-side secrets.
- `NEXTAUTH_URL` exactly matches the production domain.
- A generated `NEXTAUTH_SECRET` is set.
- Signup/login, dashboard, chat, and `/api/health` are verified after deployment.
