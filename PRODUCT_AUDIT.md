# OmniAI Product Audit

## Current Status

OmniAI now has the core product surfaces expected from a serious multi-model AI workspace:

- persistent chat with conversation history
- manual, suggest, and auto routing modes
- model/provider controls
- projects with instructions
- knowledge sources and memory scaffolding
- artifacts for durable outputs
- usage dashboard
- account/profile/security settings
- provider connection settings
- in-app notification bell and inbox
- routing intelligence explanation

## ChatGPT / Claude Pattern Comparison

Common patterns users expect from mature AI products:

| Pattern | Expected Behavior | OmniAI Status |
| --- | --- | --- |
| Fast new chat | A clear primary path into a new conversation. | Present through Dashboard and Chat. |
| Persistent history | Recent conversations remain visible and reopenable. | Present in Chat sidebar and Dashboard. |
| Model visibility | User can see or choose which model is active. | Present in model controls and message metadata. |
| Projects/workspaces | Context can be grouped by initiative. | Present through Projects, project instructions, knowledge, and artifacts. |
| Artifacts/outputs | Important generated outputs are saved outside the transcript. | Present through Artifacts. |
| Account controls | Profile, security, password, 2FA, notifications. | Present through Account. |
| Usage visibility | Users can see usage by model/provider. | Present through Usage. |
| Notifications | System, security, billing, provider, and usage events have an inbox. | Present through header bell and `/notifications`. |
| Settings separation | Provider and workspace controls are separate from personal account controls. | Present through Settings and Account. |
| Trust/security posture | Rate limits, tenant isolation, secret handling, and audit logs. | Present in backend and docs. |

## Notification Destination

Notifications go to:

1. Header bell in the app shell.
2. `/notifications` inbox for filtering, marking read, and archiving.
3. Account notification preferences for future email delivery controls.

Current producers:

- account signup
- workspace creation
- 2FA setup started
- 2FA enabled
- 2FA disabled
- password changed
- provider enabled/disabled

Planned producers:

- usage threshold crossed
- subscription renewal/payment failure
- provider outage/degraded mode
- auto-routing fallback used
- workspace invite accepted
- knowledge ingestion completed or failed

## Remaining Product Gaps

These are not blockers for a grounded MVP, but they are the next areas to make the product feel more complete:

- workspace member invitation and role management UI
- email verification and password reset emails
- billing checkout and subscription portal
- provider health telemetry and fallback notifications
- file upload pipeline with background ingestion jobs
- searchable global command menu
- mobile-specific navigation polish
- user feedback on routing recommendations
- cost tables per provider/model instead of rough estimates

## Readiness Assessment

The foundation is now beyond a prototype: the app has real data models, protected APIs, multi-tenant checks, persistent usage tracking, encrypted provider credentials, 2FA, and notification delivery. The next phase should focus on workflow depth rather than foundational architecture.
