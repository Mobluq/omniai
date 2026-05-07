# 0003. Prioritize Marketplace Authorization And Auditability

Status: Accepted

## Context

BD Select handles KYC, premium listings, authentication decisions, escrowed payments, payout state, shipping, disputes, and admin interventions. These areas can expose sensitive user data or move money incorrectly if ownership and workflow boundaries are unclear.

## Decision

Marketplace authorization and auditability are baseline requirements:

- User-owned resources require ownership and role checks.
- Listing, order, dispute, barter, payout, and review actions must validate workflow state.
- Sensitive data must be encrypted, tokenized, hashed, or excluded from storage.
- Security-sensitive and money-moving actions create audit events.
- Notifications and logs must not expose secrets or raw KYC/payment payloads.

## Consequences

- Feature work needs explicit authorization and state checks.
- Some flows require service-layer code even when the UI looks simple.
- Incident response has reliable records without unnecessary sensitive payloads.
