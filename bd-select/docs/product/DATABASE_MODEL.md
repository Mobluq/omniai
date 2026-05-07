# BD Select Database Model

## Bounded Contexts

| Context                 | Owns                                                  | Reads                    |
| ----------------------- | ----------------------------------------------------- | ------------------------ |
| Identity                | users, sessions, accounts, KYC, roles                 | audit, notifications     |
| Catalog                 | brands, categories, listings, photos, promotions      | identity                 |
| Authentication Workflow | review queue, decisions, AI signals, SLAs             | catalog, identity        |
| Orders                  | orders, payments, payouts, escrow state               | catalog, identity        |
| Shipping                | shipments, carrier events, hub handoff                | orders, barter           |
| Disputes                | cases, evidence, resolution                           | orders, barter, identity |
| Messaging               | threads, participants, redacted messages              | orders, barter, identity |
| Reputation              | reviews, seller score                                 | orders, identity         |
| Barter                  | swap proposals, offered listings, top-up state        | catalog, orders          |
| Seller Growth           | pro subscriptions, listing promotions, campaign state | identity, catalog        |
| Admin and Audit         | append-only action history                            | all contexts             |
| Notifications           | email, SMS, push, in-app notifications                | all contexts             |
| Risk                    | computed fraud and abuse cases, escalation actions    | all contexts             |
| Insights and Reporting  | computed operating metrics, facets, and exports       | all contexts             |

## Prisma Baseline

The initial schema in `prisma/schema.prisma` defines the durable marketplace surface:

- `User`, `Account`, `Session`, `VerificationToken`
- `SellerProfile`, `ProSubscription`, `KycVerification`
- `Brand`, `Category`, `Listing`, `ListingPhoto`, `ListingPromotion`
- `MediaAsset`
- `ReviewQueueItem`
- `Order`, `Payment`, `Payout`, `Shipment`
- `Dispute`
- `MessageThread`, `MessageThreadParticipant`, `Message`
- `Review`
- `BarterProposal`, `BarterProposalListing`
- `Notification`, `AuditLog`, `RateLimitBucket`

## Key State Machines

### Listing

`draft -> in_review -> needs_more_info -> in_review -> live -> reserved -> sold`

Terminal or exception states: `rejected`, `removed`, `barter_locked`.

Rules:

- Public catalog reads only include `live` listings.
- `reserved` listings are held by a pending payment order.
- `sold` listings cannot be offered for barter or cash sale.
- `barter_locked` listings cannot be purchased until proposal closes or expires.
- Rejected listings retain reviewer decision reason.

### Order

`pending_payment -> paid -> shipped -> delivered -> completed`

Exception states: `disputed`, `refunded`, `cancelled`.

Rules:

- Escrow state must move independently from order status.
- Payout cannot be created until payment is confirmed and order state allows release.
- Auto-confirm timer starts at delivery.

### Escrow

`not_started -> collecting -> held -> release_pending -> released`

Exception states: `refunded`, `chargeback`.

Rules:

- Processor payment status is not enough to release funds.
- Internal escrow state is the source of truth for release eligibility.
- Dispute opens hold or reset release flow.

### Barter

`proposed -> accepted -> both_shipped -> in_review -> approved_for_release -> completed`

Exception states: `dispute`, `rejected`, `expired`, `cancelled`, `blocked`.

Rules:

- Proposal must include target listing and at least one offered listing.
- Accepted proposal locks all involved listings.
- Top-up payer and amount are captured from valuation snapshot.
- BD Select hub review is required before release.

## Invariants

- A listing cannot be public without at least one approved review decision.
- Listings require six photos at the application layer; the database stores role and quality score for each photo.
- Listing media starts as `MediaAsset` upload tickets, moves to `uploaded`, then becomes `attached` when used by a listing photo.
- Users must have verified KYC before listing.
- Payment rows reference either an order or a barter proposal; application code must enforce exactly one.
- Shipment rows reference either an order or barter proposal when created; application code must enforce the owning workflow.
- Shipment event history is stored in `Shipment.events` as ordered JSON records with status, timestamp, source, note, and location. Durable workflow state remains in `Shipment.status`, `Order.status`, and `BarterProposal.status`.
- Dispute rows reference an order or barter proposal; application code must enforce exactly one.
- Dispute evidence is stored as structured JSON with `MediaAsset` references, categories, uploader ids, redacted notes, byte sizes, and attachment timestamps. Evidence files use `MediaAsset.metadata.purpose = "evidence"` and move from `ticketed` to `uploaded` to `attached`.
- Message threads can reference either an order, a barter proposal, or neither for support; service code enforces participant visibility and returns redacted message bodies to clients.
- Notifications are user-owned event records; workflow services create them as fanout from durable state changes, while read/archive state stays local to the recipient.
- Pro subscriptions are attached to seller profiles. Listing promotions are attached to listings and should be reconciled against paid billing records before production launch.
- Audit signatures cover immutable audit row fields and are written back to `AuditLog.signature` with a version string for verification and future key rotation.
- Risk cases are computed from workflow tables and audit history for the MVP. Admin acknowledgements and escalations write `AuditLog` rows; introduce a durable `RiskCase` table when queue ownership, assignment, SLAs, and analyst notes need persistent state.
- Marketplace insights are computed directly from workflow tables for the MVP. Add durable metric snapshots when leadership needs immutable reporting, cohort history, investor exports, or expensive lookback windows beyond the operational database limits.
- Admin actions write `AuditLog` rows with actor, action, entity, entity id, and prior/new state where state changed.
- PII and bank data must be provider tokens, encrypted fields, or absent from BD Select storage.

## Indexing Notes

The schema starts with indexes for:

- email, phone, role, KYC status
- listing seller/status, brand, category, price, approval time
- review queue assignee/status and SLA due time
- order buyer/status, seller/status, order status, escrow state
- shipment order/proposal ownership, courier/status, tracking number, and participant ids
- payment reference, processor/status, workflow owner
- dispute owner/status
- barter participant/status and expiry
- media owner/status, listing, storage key, and upload-ticket expiry
- dispute status/time plus evidence media through `MediaAsset.ownerId`, `MediaAsset.status`, and dispute JSON asset ids
- audit actor/time, entity/id, action, request id

Reporting reads should use existing status/time indexes first. Add rollup indexes or materialized metric tables before exposing long-range dashboards to high-concurrency admin traffic.

Search-specific indexes and vector columns should be introduced with a dedicated migration when the search architecture is selected.

## Migration Rules

- Use Prisma migrations for all durable schema changes.
- Additive changes come before destructive changes.
- Any migration touching money, KYC, audit, or order state needs rollback notes.
- JSON is for provider payloads, AI signals, event snapshots, and metadata. Do not hide primary workflow state in JSON.
- Keep monetary values in integer NGN fields until multi-currency work creates a formal money type.
