# Team Handoff

BD Select is a curated, authenticated resale marketplace for premium fashion and accessories. The first build must protect trust before it chases volume: every listing is reviewed, money is escrowed, disputes have evidence, admin actions are audited, and seller reputation is computed from real behavior.

## Start Here

1. Read `README.md`.
2. Read `docs/product/PRODUCT_BRIEF.md` for the business model, users, and launch scope.
3. Read `docs/product/PRD.md` for epics, functional requirements, user stories, and out-of-scope decisions.
4. Read `docs/product/DATABASE_MODEL.md` before changing Prisma.
5. Read `docs/product/API_SPINE.md` before extending route handlers or services.
6. Read `docs/product/SECURITY_AND_COMPLIANCE.md` before touching auth, KYC, payments, escrow, messaging, admin tooling, files, AI payloads, or webhooks.
7. Read `docs/foundation/CI_CD_PLAYBOOK.md` before changing workflow or deployment behavior.
8. Record product-shaping technical decisions as ADRs under `docs/adr`.

## Non-Negotiables

- Product naming is `BD Select`.
- Route handlers stay thin.
- Business behavior belongs in `src/modules`.
- Shared infrastructure belongs in `src/lib`.
- User-owned marketplace records must be authorization-checked before read or write.
- KYC, bank, address, payment, and identity data must be tokenized, encrypted, or never stored.
- Every listing must pass the authentication review workflow before becoming public.
- Payment money movement must reconcile against internal ledger state before payout.
- Admin actions require audit entries with actor, entity, prior state, new state, timestamp, IP, and user agent when available.
- Database changes require migrations and rollback notes.
- Security-sensitive changes must be called out in pull requests.
- The temporary `x-bd-select-user-id` development auth header must be replaced before public production launch.

## Local Validation

```bash
npm run validate
npm run build
```

On Windows PowerShell, use `npm.cmd` if needed:

```bash
npm.cmd run validate
npm.cmd run build
```

## Local Product Demo

```bash
$env:SEED_DEMO_DATA="true"
npm.cmd run db:seed
npm.cmd run dev
```

Open `/console` and use the demo personas returned by `/api/v1/dev/personas`.

Open `/onboarding` to exercise OTP, KYC, and seller activation. Development OTP is `000000`; production must use the real delivery provider and Auth.js session adapter.

Open `/sell/new` to exercise upload tickets, media completion, draft listing creation, and submission to authentication review.
