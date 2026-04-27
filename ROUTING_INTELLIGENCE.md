# Routing Intelligence

OmniAI does not treat "best model" as a hardcoded provider name. The current foundation uses a transparent scoring model that can later be upgraded with live benchmarks, user feedback, and an LLM classifier.

## What Is Measured

The recommendation engine scores each available model with these factors:

| Factor | Weight | Meaning |
| --- | ---: | --- |
| Capability match | 44% | Whether the model supports the task capability, such as image generation, code generation, summarization, document analysis, or research. |
| Task quality | 22% | Task-specific strength from the model registry. Coding tasks prioritize coding and reasoning. Writing tasks prioritize writing and reasoning. Image tasks require image support. |
| Context fit | 10% | Whether the model has enough context window for long prompts, documents, project instructions, memory summaries, and retrieved knowledge. |
| Speed | 10% | Relative latency rating for repeated workflows. |
| Cost | 8% | Cost tier preference so cheaper models can win when quality is close. |
| Preference | 6% | User or workspace preferred provider/model. |

Workspace provider restrictions are applied before scoring. Disabled or unavailable providers should not be candidates.

## How Task Context Is Understood

The MVP classifier is rule-based and maps prompt patterns to an intent:

- `image_generation`
- `image_editing`
- `coding`
- `debugging`
- `long_form_writing`
- `business_strategy`
- `research`
- `summarization`
- `data_analysis`
- `document_analysis`
- `creative_writing`
- `business_writing`
- `general_chat`

Each intent maps to required capabilities. For example, "Debug this React component" maps to `debugging` with `code_generation` and `reasoning`; "Summarize this board document" maps to `document_analysis` with `document_analysis` and `long_context`.

## Context Assembly

Before a provider call, the chat orchestrator prepares:

1. The stored user message.
2. Project instructions.
3. Relevant knowledge chunks from the memory service.
4. Conversation memory summaries.
5. Routing mode and current selected model.

Retrieved knowledge is treated as untrusted context so it can inform the model without overriding system behavior.

## Upgrade Path

The rule-based classifier is intentionally isolated. Future versions can add:

- LLM-based intent classification.
- Provider health and latency telemetry.
- Per-workspace satisfaction feedback.
- Real cost tables per provider/model.
- Automated fallback when a provider fails.
- Online evaluation by task category.
