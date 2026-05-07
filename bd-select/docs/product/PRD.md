# BD Select PRD

## MVP Epics

| Epic | Scope | MVP |
| --- | --- | --- |
| E1 Account and identity | Email/phone OTP, OAuth, profiles, KYC, roles | Yes |
| E2 Listing and media | Six-photo wizard, AI suggestions, drafts, preview | Yes |
| E3 Authentication review | Queue, AI signals, reviewer decisions, senior co-sign | Yes |
| E4 Catalog and search | Browse, filters, listing detail, related listings | Yes |
| E5 Checkout and escrow | Buy now, payment initiation, held funds, payout state | Yes |
| E6 Shipping | Carrier rates, labels, tracking, hubs, insurance metadata | Yes |
| E7 Orders | Buyer/seller order state, delivery confirmation, auto-confirm | Yes |
| E8 Disputes | Evidence upload, funds held, admin resolution | Yes |
| E9 Reviews and seller score | Two-way reviews and composite seller score | Yes |

## V1 Epics

| Epic | Scope |
| --- | --- |
| E10 Barter | Swap proposal, valuation delta, top-up, dual-shipment escrow |
| E11 Pro sellers | Tiered subscriptions, bulk listing, dashboards, storefronts |
| E12 Promotions and drops | Bumps, featured listings, editorial drops, seller credits |

## V2 Epics

| Epic | Scope |
| --- | --- |
| E13 Native mobile | iOS first, Android next, camera-first listing UX |
| E14 Pan-African expansion | Multi-currency, multi-locale, country-specific KYC and couriers |

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-001 | Users can create accounts using email plus OTP, Google, or Apple. | Must |
| FR-002 | Users must complete BVN or NIN-based KYC before listing items. | Must |
| FR-003 | Listings require at least six photos with AI quality scoring. | Must |
| FR-004 | Every listing enters review and cannot go public without approval. | Must |
| FR-005 | Buyer payments stay in escrow until delivery confirmation or 72-hour auto-confirm. | Must |
| FR-006 | Checkout supports card, transfer, and USSD through Nigerian payment processors. | Must |
| FR-007 | Shipping integrates with GIG, Sendbox, and Topship at minimum. | Must |
| FR-008 | Buyers can open disputes up to seven days post-delivery with evidence. | Must |
| FR-009 | Seller score updates after completed orders using the defined formula. | Must |
| FR-010 | Image search supports photo upload to similar listings. | Should |
| FR-011 | Barter supports valuation, top-up, and escrowed dual-shipment. | Must V1 |
| FR-012 | Promoted listings can be bought using in-app credit. | Should V1 |
| FR-013 | Pro sellers can bulk upload CSV plus zipped photos. | Should V1 |
| FR-014 | Native iOS reaches web V1 parity. | Must V2 |
| FR-015 | Native Android reaches iOS V2 parity. | Must V2 |
| FR-016 | Admin tools include queue, disputes, payouts, bans, audit, and AI confidence. | Must |
| FR-017 | All admin actions are logged with actor, timestamp, prior state, and new state. | Must |
| FR-018 | Messaging filters phone numbers, external URLs, and off-platform deal attempts. | Must |

## Core User Flows

### Buyer Cash Purchase

1. Buyer discovers a live authenticated listing.
2. Buyer reviews badge, condition, seller score, photos, price, shipping estimate, and comps.
3. Buyer checks out through Paystack or Flutterwave.
4. Funds move into escrow.
5. Seller ships within the required SLA.
6. Delivery is confirmed by buyer or auto-confirmed after 72 hours.
7. Payout releases to seller after dispute window rules are satisfied.
8. Buyer leaves a review and seller score updates.

### Seller Listing

1. Seller passes KYC.
2. Seller creates draft listing with required photos: front, back, label, defect/detail, sole/heel or comparable proof, and packaging/receipt when available.
3. AI suggests brand, model, category, condition, price band, and photo-quality issues.
4. Seller submits listing to review.
5. Queue assigns priority by value, category, seller score, brand restriction, and AI confidence.
6. Reviewer approves, rejects, escalates, or requests more photos.
7. Approved listing becomes public. Rejected listing stores decision reason.

### Barter

1. User taps offer a swap on a live target listing.
2. User selects one or more own live listings.
3. Valuation engine computes fair-value delta and top-up.
4. Recipient accepts, rejects, or lets proposal expire.
5. Accepted items move to barter-locked state and top-up is captured to escrow.
6. Both parties ship to a BD Select hub.
7. BD Select re-authenticates both items.
8. Items are forwarded, top-up settles, and both listings close.

## Admin Requirements

- Review queue by SLA, price band, category, restricted brand, AI confidence, and seller score.
- Decision taxonomy: approve, reject, request more photos, escalate.
- Senior co-sign for restricted brands and listings above high-value thresholds.
- Dispute center with evidence timeline, order/payment/shipment context, and resolution outcomes.
- Payout management with reconciliation state and processor reference.
- Banned-user list and reason history.
- Append-only audit view with filters by actor, entity, action, request, and time.

## Out Of Scope

- Fast-fashion resale.
- New retail marketplace beyond controlled editorial drops.
- Auctions before V2 pilot.
- Cross-border buyer flow in Phase 1.
- Direct buyer-seller exchange of phone numbers, WhatsApp links, social handles, or off-platform payment links.

## Acceptance Standard

Any feature touching money, KYC, listings, authentication, disputes, messaging, or admin controls must ship with permission checks, audit coverage, tests, failure states, and rollback notes.
