# BD Select Product Brief

## Summary

BD Select is a curated resale marketplace for premium fashion and accessories, starting in Nigeria and expanding across Africa. The product promise is simple: every public listing is authenticated, fairly presented, and protected by escrow, logistics controls, dispute handling, and seller reputation.

## Positioning

- Category: authenticated premium fashion resale.
- Launch geography: Lagos first, Abuja next, then Port Harcourt, Ibadan, and Kano.
- Expansion geography: Ghana, Kenya, South Africa, then broader African markets.
- Core line: authenticated resale of premium fashion, built for Africa.
- Market posture: curated club, not open-floor classifieds.

## Product Principles

- Trust beats volume. Listings wait for review when authenticity, pricing, or photo quality is uncertain.
- Curation is a product feature. Fast fashion, counterfeit goods, poor-condition goods, and weak photos should be rejected.
- Money movement is controlled. Buyer funds stay in escrow until delivery confirmation, auto-confirm, or dispute outcome.
- Seller quality is earned. Seller score comes from ratings, authentication pass rate, shipping speed, responsiveness, and dispute history.
- Barter is native. Swaps are first-class marketplace transactions with valuation, top-up, shipping, re-authentication, and dispute states.
- Admin work must be auditable. Human review, disputes, payout changes, bans, refunds, and support overrides require append-only audit.

## Users

| Persona | Need | Product response |
| --- | --- | --- |
| Premium buyer | Wants authentic premium fashion without fake risk | Verified listings, authentication badges, escrow, buyer protection |
| High-value buyer | Wants luxury-grade confidence | Restricted-brand routing, senior co-sign, insurance, evidence trail |
| Casual seller | Wants easy listing without public phone-number negotiation | Guided listing wizard, AI field suggestions, protected messaging |
| Power seller | Wants operational tooling and credibility | Pro tiers, bulk upload, dashboards, priority review, storefronts |
| Barter user | Wants to treat closet items as assets | Swap offers, valuation delta, top-up, dual-shipment escrow |
| Authenticator | Needs fast review with low miss rate | AI signals, queue priority, senior escalation, decision taxonomy |
| Admin operator | Needs dispute, payout, and abuse control | Admin queue, audit log, banned-user list, confidence dashboards |

## Launch Scope

MVP must support account creation, KYC, listing creation, media upload, authentication review, catalog/search, checkout, escrow, shipping, order management, disputes, reviews, seller score, admin tools, notifications, and audit logs.

V1 adds barter, Pro seller subscriptions, promoted listings, weekly editorial drops, saved searches, and image search.

V2 adds native iOS and Android, richer recommendations, multi-currency, multi-locale, and pan-African operations.

## Business Model

| Revenue stream | Mechanic |
| --- | --- |
| Marketplace commission | 8% seller fee plus 4% buyer fee on cash sale GMV |
| Authentication fee | Tiered flat fee on high-value items |
| Barter facilitation | 2% of cash top-up only |
| Pro seller subscription | Tier 1, Tier 2, and Tier 3 monthly plans |
| Promoted listings | Bumps, featured slots, and editorial placement |
| Payment margin | Small margin on processor pass-through where allowed |
| Logistics margin | Negotiated carrier rate versus charged shipping |
| Editorial drops | Curated inventory and brand collaborations |

## Integrations To Plan For

- Payments: Paystack primary, Flutterwave failover.
- KYC: Mono and Dojah for BVN, NIN, selfie/liveness, and tokenized identity checks.
- Shipping: GIG, Sendbox, Topship, Kwik, and DHL.
- Notifications: Termii/Twilio SMS, SendGrid email, Firebase Cloud Messaging later.
- Media: Cloudflare R2 and Cloudflare Images.
- Search: Meilisearch early, OpenSearch or equivalent at scale.
- AI/ML: authenticity co-pilot, pricing intelligence, image search, fraud signals, photo quality scoring, support co-pilot.

## Operating Assumptions

- Phase 0 seed closet: 500 hand-onboarded sellers and 8,000+ vetted SKUs before broad launch.
- Soft launch: Lagos invite-only, with 1,500 buyers and review-process calibration.
- Public launch: Lagos and Abuja, with brand campaign and logistics integrations live.
- National phase: Lagos, Abuja, Port Harcourt, Ibadan, and Kano.
- Regional phase: Ghana, Kenya, and South Africa.

## Open Decisions

- Backend service split after MVP: keep modules inside Next.js first, then extract workers/services when load and ownership justify it.
- Insurance partner and reserve policy by M9.
- Exact legal entity name and trademark path.
- Final image-search vector store: pgvector for early prototypes, Qdrant/OpenSearch vector when scale requires it.
