import "server-only";
import type { ModelCapability } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env/server";
import { badRequest } from "@/lib/errors/app-error";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import type { ProviderConfig } from "@/modules/ai/providers/base-provider";
import { createProvider, isProviderId } from "@/modules/ai/providers/provider-factory";
import type { ProviderId } from "@/modules/ai/providers/types";
import { ModelRegistryService } from "@/modules/ai/registry/model-registry";

export const providerCatalog: Array<{
  id: ProviderId;
  displayName: string;
  keyLabel: string;
  envKeys: string[];
}> = [
  {
    id: "openai",
    displayName: "OpenAI / ChatGPT",
    keyLabel: "OpenAI API key",
    envKeys: ["OPENAI_API_KEY"],
  },
  {
    id: "anthropic",
    displayName: "Anthropic Claude",
    keyLabel: "Anthropic API key",
    envKeys: ["ANTHROPIC_API_KEY"],
  },
  {
    id: "google",
    displayName: "Google Gemini",
    keyLabel: "Google AI API key",
    envKeys: ["GOOGLE_AI_API_KEY"],
  },
  {
    id: "mistral",
    displayName: "Mistral",
    keyLabel: "Mistral API key",
    envKeys: ["MISTRAL_API_KEY"],
  },
  {
    id: "stability",
    displayName: "Stability AI",
    keyLabel: "Stability API key",
    envKeys: ["STABILITY_API_KEY"],
  },
  {
    id: "amazon",
    displayName: "Amazon Bedrock",
    keyLabel: "AWS access keys or runtime role",
    envKeys: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_BEDROCK_MODEL_ID"],
  },
];

export type ProviderConnection = {
  provider: ProviderId;
  displayName: string;
  keyLabel: string;
  envKeys: string[];
  envConfigured: boolean;
  workspaceConfigured: boolean;
  isEnabled: boolean;
  status: "available" | "disabled" | "degraded" | "beta";
  models: Array<{
    modelId: string;
    displayName: string;
    description: string;
    capabilities: string[];
  }>;
};

export type UpsertProviderConfigurationInput = {
  workspaceId: string;
  provider: string;
  apiKey?: string;
  isEnabled: boolean;
};

export type ProviderRuntimeTestResult = {
  provider: ProviderId;
  configured: boolean;
  live: boolean;
  status: "ready" | "missing_credentials" | "disabled" | "configured_unverified";
  message: string;
  modelId?: string;
};

function envProviderConfigured(provider: ProviderId) {
  const env = getServerEnv();

  switch (provider) {
    case "openai":
      return Boolean(env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(env.ANTHROPIC_API_KEY);
    case "google":
      return Boolean(env.GOOGLE_AI_API_KEY);
    case "stability":
      return Boolean(env.STABILITY_API_KEY);
    case "mistral":
      return Boolean(env.MISTRAL_API_KEY);
    case "amazon":
      return Boolean(env.AWS_REGION && env.AWS_BEDROCK_MODEL_ID);
  }
}

export class ProviderConfigurationService {
  private readonly registry = new ModelRegistryService();

  async listWorkspaceConnections(userId: string, workspaceId: string): Promise<ProviderConnection[]> {
    await assertWorkspaceAccess(userId, workspaceId);
    const configs = await prisma.aIProviderConfig.findMany({
      where: { workspaceId },
    });

    return providerCatalog.map((provider) => {
      const config = configs.find((item) => item.provider === provider.id);
      const models = this.registry
        .list()
        .filter((model) => model.provider === provider.id)
        .map((model) => ({
          modelId: model.modelId,
          displayName: model.displayName,
          description: model.description,
          capabilities: model.capabilities,
        }));

      return {
        provider: provider.id,
        displayName: provider.displayName,
        keyLabel: provider.keyLabel,
        envKeys: provider.envKeys,
        envConfigured: envProviderConfigured(provider.id),
        workspaceConfigured: Boolean(config?.encryptedApiKey),
        isEnabled: config?.isEnabled ?? envProviderConfigured(provider.id),
        status: config?.status ?? (envProviderConfigured(provider.id) ? "available" : "disabled"),
        models,
      };
    });
  }

  async upsertWorkspaceConfiguration(
    userId: string,
    input: UpsertProviderConfigurationInput,
  ) {
    await assertWorkspaceAccess(userId, input.workspaceId, "admin");

    if (!isProviderId(input.provider)) {
      throw badRequest("Unsupported provider.");
    }

    const provider = providerCatalog.find((item) => item.id === input.provider)!;
    const registryModels = this.registry.list().filter((model) => model.provider === input.provider);
    const allowedCapabilities = [
      ...new Set(registryModels.flatMap((model) => model.capabilities)),
    ] as ModelCapability[];

    const config = await prisma.aIProviderConfig.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: input.workspaceId,
          provider: input.provider,
        },
      },
      update: {
        displayName: provider.displayName,
        isEnabled: input.isEnabled,
        status: input.isEnabled ? "available" : "disabled",
        allowedCapabilities,
        ...(input.apiKey?.trim()
          ? { encryptedApiKey: encryptSecret(input.apiKey.trim()) }
          : {}),
      },
      create: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        displayName: provider.displayName,
        isEnabled: input.isEnabled,
        status: input.isEnabled ? "available" : "disabled",
        allowedCapabilities,
        encryptedApiKey: input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : undefined,
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        workspaceId: input.workspaceId,
        type: "provider",
        title: `${provider.displayName} ${input.isEnabled ? "enabled" : "disabled"}`,
        body: input.isEnabled
          ? `${provider.displayName} is available for workspace routing.`
          : `${provider.displayName} will not be used for workspace routing.`,
        actionUrl: "/settings",
        metadata: {
          provider: input.provider,
          status: config.status,
        },
      },
    });

    return config;
  }

  async getRuntimeConfig(input: {
    userId?: string;
    workspaceId?: string;
    provider: ProviderId;
  }): Promise<ProviderConfig> {
    if (input.userId && input.workspaceId) {
      const config = await prisma.aIProviderConfig.findFirst({
        where: {
          workspaceId: input.workspaceId,
          provider: input.provider,
          isEnabled: true,
          encryptedApiKey: { not: null },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (config?.encryptedApiKey) {
        return { apiKey: decryptSecret(config.encryptedApiKey) };
      }
    }

    const env = getServerEnv();

    if (input.provider === "amazon") {
      return {
        aws: {
          region: env.AWS_REGION,
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          sessionToken: env.AWS_SESSION_TOKEN,
          modelId: env.AWS_BEDROCK_MODEL_ID,
        },
      };
    }

    return {};
  }

  async listRunnableProviderIds(userId: string, workspaceId: string): Promise<ProviderId[]> {
    const providers = await this.listWorkspaceConnections(userId, workspaceId);

    return providers
      .filter(
        (provider) =>
          provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured),
      )
      .map((provider) => provider.provider);
  }

  async testWorkspaceProvider(input: {
    userId: string;
    workspaceId: string;
    provider: ProviderId;
  }): Promise<ProviderRuntimeTestResult> {
    const providers = await this.listWorkspaceConnections(input.userId, input.workspaceId);
    const connection = providers.find((provider) => provider.provider === input.provider);

    if (!connection?.isEnabled) {
      return {
        provider: input.provider,
        configured: false,
        live: false,
        status: "disabled",
        message: `${connection?.displayName ?? input.provider} is disabled for this workspace.`,
      };
    }

    if (!connection.envConfigured && !connection.workspaceConfigured) {
      return {
        provider: input.provider,
        configured: false,
        live: false,
        status: "missing_credentials",
        message: "Add a workspace key or configure the provider environment variables.",
      };
    }

    const textModel = this.registry
      .list()
      .find(
        (model) =>
          model.provider === input.provider &&
          model.status === "available" &&
          model.capabilities.includes("text_generation"),
      );

    if (!textModel) {
      return {
        provider: input.provider,
        configured: true,
        live: false,
        status: "configured_unverified",
        message:
          "Credentials are available server-side. This provider does not expose a low-cost text test in OmniAI yet.",
      };
    }

    const runtimeConfig = await this.getRuntimeConfig({
      userId: input.userId,
      workspaceId: input.workspaceId,
      provider: input.provider,
    });
    const provider = createProvider(input.provider, runtimeConfig);
    await provider.generateText({
      prompt: "Reply with the exact word: OK",
      modelId: textModel.modelId,
      maxOutputTokens: 16,
    });

    return {
      provider: input.provider,
      configured: true,
      live: true,
      status: "ready",
      modelId: textModel.modelId,
      message: `${connection.displayName} accepted a live test request.`,
    };
  }
}
