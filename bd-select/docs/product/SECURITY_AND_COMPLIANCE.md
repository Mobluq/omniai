# BD Select Security And Compliance

## Security Principles

- Store the least sensitive data possible.
- Prefer provider tokens over raw BVN, NIN, bank, card, or address data.
- Encrypt or avoid sensitive fields.
- Require MFA for admins and authenticators before launch.
- Treat admin actions as regulated operations.
- Never trust processor, courier, KYC, or AI webhooks without signature validation and idempotency.

## Identity And KYC

- Account signup supports email plus OTP, phone OTP, Google, and Apple.
- Initial OTP storage uses hashed six-digit challenges with purpose, expiry, attempt count, and consumption tracking.
- Development OTP returns `000000`; production must send through Termii, Twilio, or SendGrid and must not return the code.
- Listing privileges require verified KYC.
- BVN, NIN, liveness, and bank-account checks should use Mono, Dojah, or equivalent providers.
- Raw BVN/NIN should not be stored.
- KYC rows store provider, verification type, provider reference, tokenized identity pointer, status, evidence metadata, and timestamps.
- Failed KYC attempts should rate-limit and flag suspicious repetition.

## Payments And Escrow

- Paystack is primary. Flutterwave is failover.
- BD Select stays in PCI SAQ-A scope by using hosted payment surfaces or processor-controlled fields.
- Payment webhooks require signature validation, replay protection, and idempotent processing.
- Initial Paystack and Flutterwave webhook endpoints validate provider signatures before mutating state; replay/idempotency storage still needs a dedicated webhook event table.
- Processor payment success does not equal payout eligibility.
- Internal order and escrow state decide release, refund, or hold.
- Payouts use tokenized bank accounts and processor transfer references.
- Daily reconciliation must compare internal payment, escrow, payout, and processor records.

## Logistics And Shipment Events

- Shipment creation is limited to the order seller, barter participant, or support operators.
- Carrier events are stored as append-only JSON history on each shipment while current workflow state remains in typed status columns.
- Delivery events move shipped orders to delivered; barter shipments move accepted swaps toward hub review only after both sides are delivered.
- Failed, returned, or cancelled shipment events are treated as exceptions and notify visible participants.
- Production carrier integrations must validate provider signatures, enforce idempotency, and reconcile tracking state against internal shipment records.

## Messaging And PII

- Buyer-seller messaging must filter phone numbers, WhatsApp links, Instagram handles when used for off-platform dealing, external payment URLs, and suspicious contact phrases.
- Store original body only when legal and moderation policy allows it. Prefer redacted body for product display.
- Current implementation stores `Message.body` server-side, returns only `Message.redactedBody` through the API, and marks the client payload with `redacted=true` when contact details were detected.
- Thread access is limited to participants; admin and super-admin operators can list/read open or locked threads and join by sending support messages.
- Thread creation and message sending write `AuditLog` rows without message content.
- Repeated off-platform attempts should flag the account for review.

## Listing Media

- Upload tickets are user-owned and expire.
- Listing creation can only attach uploaded media owned by the seller.
- Initial local preview endpoints are for development. Production should use Cloudflare R2 and Cloudflare Images signed upload URLs, transformations, and public delivery IDs.
- Image content type and size are validated before upload tickets are issued.

## Dispute Evidence

- Evidence upload tickets require dispute participant or support-operator access before any media record is created.
- Evidence files support JPEG, PNG, WebP, and PDF, with a 20MB application-layer limit.
- Evidence notes are sanitized and marketplace contact details are redacted before they are stored in the dispute evidence payload.
- Attaching evidence writes an audit row, marks the media asset attached, and notifies visible case participants plus support operators.
- Production storage should use private object keys, signed upload URLs, malware scanning, and retention/export policy before public launch.

## Authentication Workflow

- Every listing requires human review before public visibility.
- AI scores are advisory, not final.
- Restricted brands and high-value items require senior review.
- Rejection reasons should be structured for fraud analysis and seller education.
- Reviewer actions write audit records.
- A sample of approved listings should be rechecked for reviewer accuracy.

## Admin And Audit

Audit log records should include:

- actor id
- action
- entity and entity id
- prior state
- new state
- request id
- IP address
- user agent
- timestamp

Audit rows are append-only. Daily signing and weekly cold storage should be added before launch.

Current implementation includes an admin-only audit center and deterministic batch signing for unsigned audit rows. Signatures cover the event identity, actor, action, entity, state snapshots, request metadata, and creation timestamp. Production should set `AUDIT_SIGNING_SECRET` and export signed batches to cold storage.

## Notifications

- In-app notifications are stored per user and must never expose another user's PII or hidden moderation data.
- Current implementation emits notification records from order, barter, dispute, payout, review, support-thread, and message workflows.
- Notification actions must point to internal BD Select routes only.
- Email, SMS, and push delivery should be treated as fanout from the same durable in-app event, not as the source of truth.
- Archiving a notification hides it from the active feed but does not delete the underlying workflow record or audit trail.

## Seller Growth And Promotions

- Pro seller tooling requires verified KYC and an active seller profile.
- Current implementation records local Pro plan activation and listing promotion inventory for workflow development; it does not charge a payment method.
- Production Pro subscriptions and promotions must reconcile against hosted processor billing records before activation.
- Promotions can only attach to seller-owned listings in eligible marketplace states.
- Seller plan changes and promotion creation write audit records and notify the seller.

## Fraud And Abuse Controls

- Device, IP, KYC, address, and payment anomalies should feed a fraud score.
- Image reuse and stolen-photo detection should run before review approval.
- Price anomalies should route to review.
- Counterfeit attempts should progress from warning to suspension to permanent ban.
- Shared blocklists with PSPs should be evaluated after legal review.
- Current implementation includes an admin-only risk center that computes cases from listing authenticity/price signals, off-platform message redactions, shipment exceptions, active disputes, and identity/KYC signals.
- Risk escalations are routed into existing workflows: listing review escalation, thread locking, dispute evidence requests, shipment review notifications, or account review notices.
- Risk actions write audit rows. Persistent risk assignment, analyst notes, device graphing, and fraud model versioning should be added before production launch.

## Insights And Reporting

- Reporting routes are admin-only and must stay behind the same MFA and role checks as audit and risk operations.
- Current insights are aggregate operational metrics over marketplace workflows; they should not expose raw message bodies, buyer contact data, bank tokens, KYC evidence, or private dispute notes.
- Investor, finance, or external reporting exports should come from signed snapshot jobs with explicit retention rules, not ad hoc production database reads.
- Any analytics provider added later must be consent-aware and must avoid sending marketplace PII, KYC artifacts, evidence files, or payment identifiers.

## Privacy And Compliance

- Nigeria Data Protection Regulation compliance is required.
- Consent-managed analytics are required.
- Data access and deletion workflows must be documented before launch.
- Transactional records may need retention even when PII is erased.
- VAT, CIT, FCCPC, and CBN obligations should be handled with local counsel and licensed PSPs.

## Operational Targets

- p95 API response below 350ms for normal user flows.
- p95 page load below 2.5s on 4G for key pages.
- 99.9% availability target.
- RPO 15 minutes and RTO 4 hours once production data exists.
- Structured JSON logs, Sentry, traces, and business metric dashboards.
