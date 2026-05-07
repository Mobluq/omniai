# BD Select API Spine

This is the first implementation pass for the documented MVP workflows. Routes are intentionally thin and call domain services under `src/modules/marketplace`.

## Authentication Boundary

Protected routes currently use `x-bd-select-user-id` through `src/lib/auth/current-user.ts` so workflow services can be developed before the final Auth.js OTP/OAuth/MFA integration is complete.

This header is rejected in production unless `ALLOW_TRUSTED_AUTH_HEADERS=true`. Do not enable that in public production traffic. Replace it with the real session adapter before launch.

## Implemented Routes

| Route                                            | Method | Purpose                                                                                                              |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/auth/otp/request`                       | POST   | Create email/phone OTP challenge                                                                                     |
| `/api/v1/auth/otp/verify`                        | POST   | Verify OTP and create/update user                                                                                    |
| `/api/v1/catalog/taxonomy`                       | GET    | Return brands and categories                                                                                         |
| `/api/v1/search`                                 | GET    | Return live listings with basic filters                                                                              |
| `/api/v1/listings`                               | POST   | Create a draft listing for a verified seller                                                                         |
| `/api/v1/listings/:listingId`                    | GET    | Return a public live listing                                                                                         |
| `/api/v1/listings/:listingId/submit`             | POST   | Submit draft or needs-more-info listing to authentication review                                                     |
| `/api/v1/media/upload-tickets`                   | POST   | Create an image upload ticket for listing media                                                                      |
| `/api/v1/media/assets/:assetId/complete`         | POST   | Mark upload complete and score image metadata                                                                        |
| `/api/v1/media/assets/:assetId/preview`          | GET    | Local-development preview for media assets                                                                           |
| `/api/v1/evidence`                               | GET    | Return dispute evidence cases visible to the current participant or support operator                                 |
| `/api/v1/evidence/upload-tickets`                | POST   | Create an evidence upload ticket for a dispute image or PDF                                                          |
| `/api/v1/evidence/attachments`                   | POST   | Attach uploaded evidence to a dispute, audit the change, and notify case participants                                |
| `/api/v1/logistics/shipments`                    | GET    | Return visible shipments, paid orders eligible for shipment, and accepted barter proposals                           |
| `/api/v1/logistics/order-shipments`              | POST   | Create shipment tracking for a paid order and move the order to shipped                                              |
| `/api/v1/logistics/barter-shipments`             | POST   | Create shipment tracking for one side of an accepted barter proposal                                                 |
| `/api/v1/logistics/shipments/:shipmentId/events` | POST   | Record a shipment event, update order/barter state, audit the change, and notify participants                        |
| `/api/v1/admin/queue`                            | GET    | Return active authentication queue items                                                                             |
| `/api/v1/admin/queue/:queueItemId/decide`        | POST   | Approve, reject, request photos, or escalate a listing                                                               |
| `/api/v1/admin/disputes`                         | GET    | Return active disputes with order, escrow, listing, and participant context                                          |
| `/api/v1/admin/disputes/:disputeId/resolve`      | POST   | Resolve a dispute as refund, partial payout, return required, rejected claim, or closed                              |
| `/api/v1/admin/payouts`                          | GET    | Return active seller payouts with order, seller, and escrow context                                                  |
| `/api/v1/admin/payouts/:payoutId/transition`     | POST   | Start processing, mark paid, mark failed, or cancel an active payout                                                 |
| `/api/v1/admin/audit`                            | GET    | Return admin-only audit ledger entries with action, entity, and signature filters                                    |
| `/api/v1/admin/audit/sign-batch`                 | POST   | Sign the next batch of unsigned audit rows for integrity coverage                                                    |
| `/api/v1/admin/insights`                         | GET    | Return admin-only marketplace reporting across revenue, supply, trust, logistics, barter, growth, users, and payouts |
| `/api/v1/admin/risk`                             | GET    | Return computed fraud, abuse, logistics, dispute, identity, and listing risk cases                                   |
| `/api/v1/admin/risk/actions`                     | POST   | Acknowledge or escalate a risk case into the relevant marketplace workflow                                           |
| `/api/v1/orders`                                 | POST   | Create a pending-payment order and reserve the listing                                                               |
| `/api/v1/orders`                                 | GET    | Return orders where current user is buyer or seller                                                                  |
| `/api/v1/orders/:orderId/pay`                    | POST   | Record local/manual payment and hold escrow                                                                          |
| `/api/v1/orders/:orderId/ship`                   | POST   | Seller creates shipment and moves order to shipped                                                                   |
| `/api/v1/orders/:orderId/confirm-delivery`       | POST   | Buyer confirms delivery and queues release state                                                                     |
| `/api/v1/orders/:orderId/dispute`                | POST   | Open dispute and hold escrow                                                                                         |
| `/api/v1/orders/:orderId/reviews`                | POST   | Buyer or seller writes a review and seller score updates                                                             |
| `/api/v1/barter/proposals`                       | GET    | Return barter proposals where current user is initiator or recipient                                                 |
| `/api/v1/barter/proposals`                       | POST   | Create a swap proposal with valuation snapshot and top-up                                                            |
| `/api/v1/barter/proposals/:proposalId/accept`    | POST   | Accept barter proposal and lock involved listings                                                                    |
| `/api/v1/messages/threads`                       | GET    | Return visible support, order, and barter message threads for a participant or support operator                      |
| `/api/v1/messages/threads`                       | POST   | Create or reuse a support, order, or barter message thread                                                           |
| `/api/v1/messages/threads/:threadId`             | GET    | Return one message thread with participant and redacted message history                                              |
| `/api/v1/messages/threads/:threadId/messages`    | POST   | Send a message with raw server storage, redacted client display, and audit metadata                                  |
| `/api/v1/notifications`                          | GET    | Return current-user notifications with status and type filters                                                       |
| `/api/v1/notifications/read-all`                 | POST   | Mark all active current-user notifications read                                                                      |
| `/api/v1/notifications/:notificationId/read`     | POST   | Mark one current-user notification read                                                                              |
| `/api/v1/notifications/:notificationId/archive`  | POST   | Archive one current-user notification                                                                                |
| `/api/v1/me`                                     | GET    | Return current user profile                                                                                          |
| `/api/v1/me/kyc`                                 | POST   | Submit KYC evidence and provider reference                                                                           |
| `/api/v1/seller/profile`                         | POST   | Activate or update seller profile after KYC                                                                          |
| `/api/v1/seller/growth`                          | GET    | Return seller growth workspace data, Pro plans, listing promotion plans, and inventory                               |
| `/api/v1/seller/pro-subscriptions`               | POST   | Activate a local Pro seller subscription plan and update seller listing limits                                       |
| `/api/v1/seller/promotions`                      | POST   | Create an active listing promotion for an eligible Pro seller listing                                                |
| `/api/v1/dev/personas`                           | GET    | Return local demo users outside production                                                                           |
| `/api/v1/webhooks/paystack`                      | POST   | Verify Paystack signature and mark matching payment/order paid                                                       |
| `/api/v1/webhooks/flutterwave`                   | POST   | Verify Flutterwave hash and mark matching payment/order paid                                                         |
| `/api/v1/webhooks/gig`                           | POST   | Apply GIG shipment event by tracking number                                                                          |
| `/api/v1/webhooks/sendbox`                       | POST   | Apply Sendbox shipment event by tracking number                                                                      |

## Implemented UI

- `/`: product overview with health and console links.
- `/console`: local operations console for buyer, seller, authenticator, and admin personas.
- `/onboarding`: local OTP, KYC, and seller activation flow.
- `/sell/new`: seller listing wizard with six required media roles.
- `/marketplace`: buyer marketplace browse, search, listing cards, and escrow order creation.
- `/marketplace/:listingId`: public listing detail with authentication media, seller score, and escrow checkout.
- `/orders`: buyer/seller order center for payment recording, shipment creation, delivery confirmation, disputes, and reviews.
- `/logistics`: shipping hub for order/barter shipment creation, carrier events, risk states, and delivery handoff.
- `/admin`: trust desk for authentication queue decisions and dispute operations.
- `/admin/audit`: compliance ledger for audit event inspection, filters, and signature coverage.
- `/admin/insights`: marketplace reporting dashboard for GMV, escrow, supply, trust, logistics, barter, seller growth, users, payouts, and top seller/brand/category breakdowns.
- `/admin/risk`: risk center for computed fraud/abuse cases, signals, and escalation actions.
- `/barter`: seller swap desk for proposal composition, value comparison, top-up preview, and acceptance.
- `/payouts`: finance desk for payout review, processor state transitions, and escrow release tracking.
- `/inbox`: support, order, and barter thread console with marketplace contact redaction.
- `/notifications`: current-user event center for support, marketplace, trust, barter, payout, and review notifications.
- `/evidence`: dispute evidence vault for participant and support uploads, case files, and attachment history.
- `/seller/growth`: seller monetization desk for Pro plans, listing capacity, and promotions.
- The console expects demo data from `SEED_DEMO_DATA=true npm run db:seed`.

## Implemented Services

- `CatalogService`: taxonomy, search, public listing detail, create listing, submit listing.
- `ReviewService`: queue list and review decisions.
- `OrderService`: order quote, order creation, local payment recording, seller shipment, delivery confirmation, dispute opening, review creation, seller-score recomputation.
- `BarterService`: proposal creation, valuation snapshot, acceptance and listing lock.
- `MessageService`: support/order/barter threads, participant and support-operator access control, marketplace PII redaction, and audit-backed thread/message events.
- `NotificationService`: current-user notification feed, read/archive state, status/type filters, and event-center delivery for marketplace workflow events.
- `GrowthService`: seller Pro subscription activation, listing limits, promotion creation, audit events, and notification fanout.
- `AuditService`: admin-only audit ledger search, signature verification, and batch signing.
- `InsightsService`: admin-only reporting over operational tables with range filters, daily series, status facets, revenue breakdowns, and top seller performance.
- `RiskService`: computed marketplace risk cases, signal scoring, admin acknowledgements, and workflow escalations.
- `EvidenceService`: dispute evidence access control, upload ticket gating, attachment history, audit rows, and notification fanout.
- `LogisticsService`: order and barter shipment workspace, shipment creation, carrier event recording, delivery state transitions, audit rows, and notification fanout.
- `WebhookService`: signed payment webhooks and shipment status events.
- `OtpService`: email/phone OTP challenge creation and verification.
- `KycService`: provider-shaped KYC submission and seller profile activation.
- `MediaService`: upload-ticket creation, upload completion, preview lookup, media quality scoring.
- `OperationsService`: admin-only dispute and payout operations with audited state transitions.

## Still Required

- Real Auth.js flows: email OTP, phone OTP, Google, Apple, admin MFA.
- External Termii/Twilio/SendGrid delivery for OTP messages.
- Mono/Dojah provider contract implementation for KYC.
- Hosted payment initiation screens and provider contract tests.
- Hosted shipping label/rate purchase and provider contract tests.
- Payout release worker and reconciliation.
- Cloudflare R2/Images presigned-upload implementation.
- Search engine indexing and image search.
- External notification delivery providers for email, SMS, and push fanout.
- Hosted billing for Pro seller subscriptions and promotion purchases.
- External cold-storage export for signed audit batches.
- Provider contract tests for payout release, refund execution, and reconciliation files.
