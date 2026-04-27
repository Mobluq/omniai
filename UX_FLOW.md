# OmniAI UX Flow

## Product Principle

OmniAI should behave like an operating workspace for AI work. The user should not need to know which model is best before starting. They should describe the work, attach context, and let OmniAI recommend, compare, route, store, and organize the result.

## Primary Information Architecture

1. Dashboard
   - Workspace health
   - Recent conversations
   - Active projects
   - Provider readiness
   - Usage and cost
   - Recommendations for setup

2. Projects
   - Goal and description
   - Default instructions
   - Default routing mode and model
   - Conversations
   - Knowledge sources
   - Generated artifacts

3. Chat
   - Conversation history
   - Project-aware message thread
   - Routing controls
   - Model selector
   - Recommendation banner
   - Context injection from project/workspace knowledge
   - Automatic artifact capture

4. Knowledge
   - Workspace-wide notes
   - Project-specific notes
   - URLs
   - File text ingestion
   - Sanitization and chunking
   - Future vector embeddings

5. Artifacts
   - Documents
   - Images
   - Code
   - Research briefs
   - Proposals
   - Saved prompts

6. Settings
   - Provider connections
   - Workspace API keys
   - Routing defaults
   - Memory controls
   - Retention
   - Security posture

## First-Run Flow

1. User signs up with invite code.
2. App creates a workspace.
3. Dashboard asks the user to complete setup:
   - Connect at least one provider.
   - Create first project.
   - Add knowledge.
   - Start first task.
4. User can skip setup and use safe placeholder adapters.

## Provider Setup Flow

1. User opens Settings.
2. User sees provider cards:
   - OpenAI / ChatGPT
   - Claude
   - Gemini
   - Mistral
   - Stability AI
   - Amazon Bedrock
3. User adds a key or uses deployment env keys.
4. App stores workspace keys encrypted.
5. Provider appears as connected.
6. Future enhancement: add Test Connection and model sync.

## Project Flow

1. User creates project.
2. User adds:
   - Description
   - Instructions
   - Routing mode
   - Optional default provider/model
3. User adds knowledge.
4. User opens chat from the project.
5. New conversations inherit project context.
6. Outputs are saved as artifacts when meaningful.

## Chat Routing Flow

1. User sends message.
2. App stores user message.
3. Intent classifier evaluates task.
4. Recommendation engine scores models.
5. If mode is manual:
   - Selected model is used.
6. If mode is suggest:
   - App pauses with recommendation when a better model exists.
   - User can switch, stay, or auto-route.
   - Continuing uses the already-stored message.
7. If mode is auto:
   - Best model is selected.
8. Project and workspace knowledge are injected as untrusted context.
9. Provider adapter executes or returns safe no-key guidance.
10. Assistant message is stored.
11. Usage is logged.
12. Artifact is saved automatically when output is valuable.

## Knowledge Flow

1. User selects workspace-wide or project-specific scope.
2. User adds a note, URL, or file text.
3. App sanitizes text.
4. App chunks the content.
5. Chunks become retrievable context.
6. Future enhancement: create embeddings and semantic retrieval.

## Artifact Flow

1. App detects valuable assistant output:
   - Image
   - Code
   - Proposal
   - Research
   - Long document
2. App creates an artifact record.
3. Artifact appears in the Artifacts page.
4. Future enhancement: export, edit, version, share, and approve.

## Team Flow

Future work:

1. Owner invites members.
2. Admin assigns roles.
3. Workspace controls allowed providers and routing modes.
4. Usage can be reviewed by member, project, provider, and model.
5. Audit logs show sensitive actions.

## UX Quality Rules

- A user should always know where a response came from.
- A user should always know why a model was recommended.
- Provider keys should never appear after saving.
- Empty states should tell the user the next useful action.
- Chat history should be persistent and recoverable.
- Projects should be the default unit for serious work.
- Knowledge should be visible before it becomes invisible prompt context.
- Auto-routing should be explainable, never magical.

## Build Roadmap

### Now Implemented

- Provider hub with encrypted workspace keys.
- Persistent chat history.
- Recommendation pause and continuation.
- Project data model and UI.
- Knowledge source data model and UI.
- Artifact data model and automatic capture.
- Dashboard uses live workspace data.

### Next

- Test Connection per provider.
- Model comparison before sending.
- File upload parsing.
- Artifact detail/editor page.
- Project detail page.
- Onboarding checklist.
- Team member management.
- Billing plan/limit enforcement.
- Audit log viewer.
- Semantic vector search with pgvector.
