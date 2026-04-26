import { z } from "zod";

export const routingModeSchema = z.enum(["manual", "suggest", "auto"]);

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
});

export const createConversationSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
  routingMode: routingModeSchema.default("suggest"),
  modelId: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(20000),
  routingMode: routingModeSchema.default("suggest"),
  selectedProvider: z.string().min(1).optional(),
  selectedModelId: z.string().min(1).optional(),
  acceptRecommendation: z.boolean().optional(),
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
  provider: z.string().min(1),
  displayName: z.string().min(1).max(80),
  encryptedApiKey: z.string().optional(),
  isEnabled: z.boolean(),
});

export const settingsUpdateSchema = z.object({
  defaultRoutingMode: routingModeSchema.optional(),
  defaultModelId: z.string().min(1).optional(),
  memoryEnabled: z.boolean().optional(),
  dataRetentionDays: z.number().int().min(1).max(3650).optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
});
