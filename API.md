# API

All API responses use the same envelope.

Success:

```json
{ "success": true, "data": {} }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You are not authorized to access this resource."
  }
}
```

## Health

`GET /api/health`

Returns service status and timestamp.

## Auth

`POST /api/auth/signup`

Creates a user and personal workspace.

```json
{
  "name": "Ada Founder",
  "email": "ada@example.com",
  "password": "long-secure-password"
}
```

Sign-in is handled by NextAuth at `/api/auth/[...nextauth]`.
Credentials sign-in accepts an optional `oneTimeCode` when two-factor authentication is enabled.

## Account

`GET /api/account/profile`

Returns the current user's profile, personal routing defaults, retention preference, and memory preference.

`PATCH /api/account/profile`

```json
{
  "name": "Ada Founder",
  "jobTitle": "Founder",
  "companyName": "Bantu & Co",
  "timezone": "Africa/Lagos",
  "locale": "en",
  "defaultRoutingMode": "suggest",
  "defaultModelId": "openai-chat-primary",
  "memoryEnabled": true,
  "dataRetentionDays": 365
}
```

`GET /api/account/notifications`

`PATCH /api/account/notifications`

```json
{
  "emailSecurityAlerts": true,
  "emailUsageAlerts": true,
  "providerIncidentAlerts": true,
  "billingAlerts": true,
  "emailWeeklyDigest": true,
  "emailProductUpdates": false
}
```

`GET /api/account/security`

Returns 2FA status, active session count, and recent security events.

`POST /api/account/security/2fa/setup`

Generates and stores an encrypted TOTP secret, returning the manual setup key and `otpauth://` URI.

`POST /api/account/security/2fa/verify`

```json
{ "token": "123456" }
```

Enables 2FA and returns one-time recovery codes.

`POST /api/account/security/2fa/disable`

```json
{ "token": "123456" }
```

`POST /api/account/security/password`

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-long-secure-password"
}
```

## Workspaces

`GET /api/workspaces`

Returns workspaces for the current user.

`POST /api/workspaces`

```json
{ "name": "Bantu & Co" }
```

`GET /api/workspaces/:id`

Requires workspace membership.

`PATCH /api/workspaces/:id`

Requires workspace admin access.

```json
{
  "defaultRoutingMode": "suggest",
  "defaultModelId": "openai-chat-primary",
  "memoryEnabled": true,
  "dataRetentionDays": 365
}
```

## Providers

`GET /api/providers?workspaceId=...`

Returns provider connection status, model options, and required environment variable names. It never returns API keys.

`PUT /api/providers`

Requires workspace admin access.

```json
{
  "workspaceId": "workspace_id",
  "provider": "anthropic",
  "apiKey": "provider-secret",
  "isEnabled": true
}
```

`POST /api/providers/test`

Checks whether a provider has server-side credentials available without exposing keys.

```json
{
  "workspaceId": "workspace_id",
  "provider": "openai"
}
```

## Conversations

`GET /api/conversations?workspaceId=...`

`POST /api/conversations`

```json
{
  "workspaceId": "workspace_id",
  "projectId": "project_id",
  "title": "New launch campaign",
  "routingMode": "suggest",
  "provider": "openai",
  "modelId": "openai-chat-primary"
}
```

## Projects

`GET /api/projects?workspaceId=...`

Returns active projects with conversation, knowledge, and artifact counts.

`POST /api/projects`

```json
{
  "workspaceId": "workspace_id",
  "name": "Fintech launch",
  "description": "Workspace for launch strategy, design, and GTM assets.",
  "instructions": "Use concise executive language.",
  "defaultRoutingMode": "suggest"
}
```

`GET /api/projects/:id`

Returns project details, recent conversations, knowledge sources, and artifacts.

`PATCH /api/projects/:id`

Updates project metadata and routing defaults.

`DELETE /api/projects/:id`

Archives a project.

## Knowledge

`GET /api/knowledge?workspaceId=...&projectId=...`

Returns workspace or project-scoped knowledge sources.

`POST /api/knowledge`

```json
{
  "workspaceId": "workspace_id",
  "projectId": "project_id",
  "type": "note",
  "title": "Brand rules",
  "content": "Use a calm enterprise tone."
}
```

## Artifacts

`GET /api/artifacts?workspaceId=...&projectId=...`

Returns generated or manually saved artifacts.

`POST /api/artifacts`

```json
{
  "workspaceId": "workspace_id",
  "projectId": "project_id",
  "type": "proposal",
  "title": "Enterprise proposal",
  "content": "..."
}
```

`GET /api/artifacts/:id`

Returns one artifact.

`DELETE /api/artifacts/:id`

Deletes an artifact.

`GET /api/conversations/:id`

`DELETE /api/conversations/:id`

Archives a conversation.

## Messages

`POST /api/conversations/:id/messages`

```json
{
  "content": "Generate an image of a futuristic Lagos skyline",
  "routingMode": "suggest",
  "selectedProvider": "openai",
  "selectedModelId": "openai-chat-primary"
}
```

In suggest mode, the endpoint can return `202` with a recommendation and no assistant message so the client can ask whether to switch.

To continue a stored message after the user accepts or rejects a recommendation:

```json
{
  "pendingMessageId": "message_id",
  "routingMode": "suggest",
  "selectedProvider": "openai",
  "selectedModelId": "openai-chat-primary",
  "acceptRecommendation": true
}
```

## Recommendation

`POST /api/recommendations/evaluate`

```json
{
  "workspaceId": "workspace_id",
  "prompt": "Debug this React component",
  "currentProvider": "openai",
  "currentModelId": "openai-chat-primary",
  "routingMode": "suggest"
}
```

## Routing

`POST /api/ai/route`

Returns a routing decision and provider placeholder output.
When provider credentials are configured, routing calls the selected provider adapter server-side.

## Usage

`GET /api/usage?workspaceId=...&days=30`

Returns request count, success/failure totals, estimated tokens, estimated cost, provider breakdown, model breakdown, request type breakdown, daily rollups, and recent metered requests.
