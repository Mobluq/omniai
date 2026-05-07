# Product Brief Template

Use this before building the long-term project. The goal is to remove ambiguity before code, database models, or infrastructure become expensive to change.

## 1. Product Identity

- Working name:
- One-sentence description:
- Primary audience:
- Secondary audiences:
- Business owner:
- Technical owner:

## 2. Problem and Outcomes

- What problem must the product solve?
- What is painful about the current workaround?
- What user behavior should change?
- What business metric should improve?
- What does success look like after 30, 90, and 180 days?

## 3. Users and Permissions

- User roles:
- Admin responsibilities:
- Team or workspace model:
- Invite flow:
- Account lifecycle:
- Data ownership rules:

## 4. Core Workflows

Describe each workflow as a user goal, not a screen list.

| Workflow | Primary user | Trigger | Happy path | Failure path | Data created |
| -------- | ------------ | ------- | ---------- | ------------ | ------------ |
|          |              |         |            |              |              |

## 5. Data Model

- Core entities:
- Tenant-scoped entities:
- Global entities:
- Sensitive fields:
- Retention requirements:
- Export/deletion requirements:
- Audit events:

## 6. Integrations

| Integration | Direction        | Auth method | Data exchanged | Rate limits | Failure behavior |
| ----------- | ---------------- | ----------- | -------------- | ----------- | ---------------- |
|             | inbound/outbound |             |                |             |                  |

## 7. Security and Compliance

- Data classification:
- Authentication requirements:
- MFA requirements:
- Authorization boundaries:
- Encryption requirements:
- Regulatory constraints:
- Logging exclusions:
- Incident response expectations:

## 8. Billing and Limits

- Pricing model:
- Trial model:
- Subscription tiers:
- Usage limits:
- Entitlement rules:
- Payment provider:
- Refund/cancellation expectations:

## 9. Non-Functional Requirements

- Availability target:
- Performance targets:
- Browser/device support:
- Accessibility target:
- Observability needs:
- Backup and recovery expectations:
- Maximum acceptable data loss:
- Maximum acceptable downtime:

## 10. MVP Boundary

- Must have:
- Should have:
- Could have:
- Explicitly out of scope:

## 11. Launch Plan

- Private alpha criteria:
- Public beta criteria:
- General availability criteria:
- Support process:
- Documentation required:
- Known risks:
