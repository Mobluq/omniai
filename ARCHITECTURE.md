# OmniAI Architecture

## Overview

OmniAI is structured as a modular Next.js SaaS application. Route handlers are thin and delegate business logic to modules under `src/modules`. Shared infrastructure lives under `src/lib`.

```text
Next.js UI
  -> API route handlers
  -> domain services
  -> Prisma/PostgreSQL
  -> AI provider adapters
```

## Core Modules

- `auth`: signup foundation and Auth.js/NextAuth configuration
- `account`: profile defaults, notification preferences, security overview, and TOTP 2FA setup
- `workspace`: multi-tenant workspace creation, listing, membership checks
- `project`: project-level working contexts with instructions, routing defaults, knowledge, conversations, and artifacts
- `conversation`: conversation and message persistence plus chat orchestration
- `ai/providers`: shared provider interface and isolated adapters
- `ai/registry`: central model capability registry
- `ai/recommendation`: rule-based intent classification and model scoring
- `ai/routing`: manual, suggest, and auto route decisions
- `knowledge` / `memory`: text sanitization, chunking, retrieval, and context injection boundary
- `artifact`: durable generated outputs such as images, code, research, proposals, and long documents
- `notification`: in-app notification inbox for security, usage, provider, billing, routing, workspace, and system events
- `usage`: request, token, model, provider, and cost metering
- `billing`: Stripe-ready plan/subscription models
- `audit`: audit event persistence
- `settings`: workspace-level settings update foundation

## Provider Abstraction

Each provider implements the same `AIProvider` interface:

```ts
generateText(input): Promise<TextGenerationOutput>
generateImage?(input): Promise<ImageGenerationOutput>
embedText?(input): Promise<EmbeddingOutput>
```

Adapters are isolated behind the provider interface. OpenAI, Anthropic, Gemini, Mistral, Stability AI, and Amazon Bedrock have server-side adapter implementations with safe no-key fallbacks. Workspace keys are resolved through the provider configuration service before falling back to deployment environment variables.

## Recommendation Engine

The initial engine uses rule-based classification:

1. Classify prompt intent.
2. Map intent to required capabilities.
3. Score available models by capability match, task-specific quality, context-window fit, speed, cost, preference, and availability.
4. Return a recommendation with confidence and switch guidance.

The classifier can later be replaced with an LLM classifier behind the same service boundary.

Current scoring weights:

- capability match: 44%
- task quality: 22%
- context fit: 10%
- speed: 10%
- cost: 8%
- user/workspace preference: 6%

Recommendation responses include the top model score breakdowns so the UI can explain why a model was selected.

## Routing Engine

Routing modes:

- `manual`: use the selected provider/model.
- `suggest`: evaluate intent and pause when a better model is available.
- `auto`: automatically select the highest scoring model.

The chat orchestrator stores the user message, evaluates recommendation, optionally pauses for user confirmation, then routes and logs usage.

Suggestion approval routes the already-stored user message, so accepting or rejecting a recommendation does not duplicate the prompt in history.

## Memory Layer

The schema supports knowledge sources, documents, chunks, embeddings, and conversation memories. The service sanitizes external content and frames retrieved snippets as untrusted context to reduce prompt injection risk.

## Notifications

Notifications are persisted in PostgreSQL and surfaced in two places: the header bell for immediate review and `/notifications` for filtering, read state, and archiving. Notifications are user-scoped with optional workspace context. Security and provider configuration events create notifications today; usage, billing, provider incident, and routing notifications can be added behind the same service without changing the UI contract.

## Scalability

The structure is ready to split into services later:

- API gateway / web app
- AI routing service
- memory service
- billing service
- usage analytics service

Queues, Redis-backed rate limiting, background embedding jobs, and provider fallback policies can be added without changing the public API shape. The current limiter is database-backed so the MVP does not depend on process memory.
