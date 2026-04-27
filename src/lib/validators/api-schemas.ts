import { z } from "zod";

export const routingModeSchema = z.enum(["manual", "suggest", "auto"]);
export const providerIdSchema = z.enum(["openai", "anthropic", "google", "stability", "mistral", "amazon"]);

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
});

export const createConversationSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional(),
  routingMode: routingModeSchema.default("suggest"),
  modelId: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
});

export const sendMessageSchema = z
  .object({
    content: z.string().min(1).max(20000).optional(),
    pendingMessageId: z.string().min(1).optional(),
    routingMode: routingModeSchema.default("suggest"),
    selectedProvider: z.string().min(1).optional(),
    selectedModelId: z.string().min(1).optional(),
    acceptRecommendation: z.boolean().optional(),
  })
  .refine((value) => value.content || value.pendingMessageId, {
    message: "content or pendingMessageId is required.",
    path: ["content"],
  });

export const recommendationRequestSchema = z.object({
  prompt: z.string().min(1).max(20000),
  workspaceId: z.string().min(1).optional(),
  currentProvider: z.string().min(1).optional(),
  currentModelId: z.string().min(1).optional(),
  routingMode: routingModeSchema.default("suggest"),
});

export const routeRequestSchema = z.object({
  prompt: z.string().min(1).max(20000),
  workspaceId: z.string().min(1),
  conversationId: z.string().min(1).optional(),
  routingMode: routingModeSchema.default("suggest"),
  selectedProvider: z.string().min(1).optional(),
  selectedModelId: z.string().min(1).optional(),
});

export const providerConfigurationSchema = z.object({
  workspaceId: z.string().min(1),
  provider: providerIdSchema,
  apiKey: z.string().max(10000).optional(),
  isEnabled: z.boolean(),
});

export const providerTestSchema = z.object({
  workspaceId: z.string().min(1),
  provider: providerIdSchema,
});

export const settingsUpdateSchema = z.object({
  defaultRoutingMode: routingModeSchema.optional(),
  defaultModelId: z.string().min(1).optional(),
  memoryEnabled: z.boolean().optional(),
  dataRetentionDays: z.number().int().min(1).max(3650).optional(),
});

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(8000).optional(),
  defaultRoutingMode: routingModeSchema.default("suggest"),
  defaultProvider: z.string().min(1).optional(),
  defaultModelId: z.string().min(1).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(8000).optional(),
  defaultRoutingMode: routingModeSchema.optional(),
  defaultProvider: z.string().min(1).nullable().optional(),
  defaultModelId: z.string().min(1).nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const createKnowledgeSourceSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  type: z.enum(["note", "url", "file"]).default("note"),
  title: z.string().min(2).max(160),
  sourceUri: z.string().url().optional(),
  content: z.string().min(1).max(100000),
});

export const createArtifactSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  messageId: z.string().min(1).optional(),
  type: z.enum(["document", "image", "code", "research", "proposal", "prompt", "other"]).default("other"),
  title: z.string().min(2).max(160),
  content: z.string().min(1).max(100000),
  provider: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
  inviteCode: z.string().max(128).optional(),
});
