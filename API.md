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

## Workspaces

`GET /api/workspaces`

Returns workspaces for the current user.

`POST /api/workspaces`

```json
{ "name": "Bantu & Co" }
```

`GET /api/workspaces/:id`

Requires workspace membership.

## Conversations

`GET /api/conversations?workspaceId=...`

`POST /api/conversations`

```json
{
  "workspaceId": "workspace_id",
  "title": "New launch campaign",
  "routingMode": "suggest",
  "provider": "openai",
  "modelId": "openai-chat-primary"
}
```

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

## Usage

`GET /api/usage?workspaceId=...`

Returns request count, estimated tokens, estimated cost, and provider breakdown.
