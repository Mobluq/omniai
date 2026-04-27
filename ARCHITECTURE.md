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
- `workspace`: multi-tenant workspace creation, listing, membership checks
- `conversation`: conversation and message persistence plus chat orchestration
- `ai/providers`: shared provider interface and isolated adapters
- `ai/registry`: central model capability registry
- `ai/recommendation`: rule-based intent classification and model scoring
- `ai/routing`: manual, suggest, and auto route decisions
- `memory`: text sanitization, chunking, retrieval, and context injection boundary
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

Adapters currently return safe placeholders. Real API calls can be added inside each adapter without changing UI components or route handlers.

## Recommendation Engine

The initial engine uses rule-based classification:

1. Classify prompt intent.
2. Map intent to required capabilities.
3. Score available models by capability match, quality, speed, cost, preference, and availability.
4. Return a recommendation with confidence and switch guidance.

The classifier can later be replaced with an LLM classifier behind the same service boundary.

## Routing Engine

Routing modes:

- `manual`: use the selected provider/model.
- `suggest`: evaluate intent and pause when a better model is available.
- `auto`: automatically select the highest scoring model.

The chat orchestrator stores the user message, evaluates recommendation, optionally pauses for user confirmation, then routes and logs usage.

## Memory Layer

The schema supports knowledge sources, documents, chunks, embeddings, and conversation memories. The service sanitizes external content and frames retrieved snippets as untrusted context to reduce prompt injection risk.

## Scalability

The structure is ready to split into services later:

- API gateway / web app
- AI routing service
- memory service
- billing service
- usage analytics service

Queues, Redis-backed rate limiting, background embedding jobs, and provider fallback policies can be added without changing the public API shape. The current limiter is database-backed so the MVP does not depend on process memory.
