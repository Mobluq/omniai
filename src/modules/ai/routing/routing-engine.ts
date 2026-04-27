import type { RoutingMode } from "@prisma/client";
import { badRequest } from "@/lib/errors/app-error";
import { createProvider, isProviderId } from "@/modules/ai/providers/provider-factory";
import { ProviderConfigurationService } from "@/modules/ai/providers/provider-config-service";
import type { TextGenerationOutput } from "@/modules/ai/providers/types";
import { RecommendationEngine } from "@/modules/ai/recommendation/recommendation-engine";
import { ModelRegistryService } from "@/modules/ai/registry/model-registry";

export type RoutingRequest = {
  prompt: string;
  routingMode: RoutingMode;
  selectedProvider?: string;
  selectedModelId?: string;
  currentProvider?: string;
  currentModelId?: string;
  acceptRecommendation?: boolean;
  context?: string[];
  userId?: string;
  workspaceId?: string;
};

export type RoutingDecision = {
  mode: RoutingMode;
  provider: string;
  modelId: string;
  modelDisplayName: string;
  shouldAskToSwitch: boolean;
  recommendationReason?: string;
};

export class RoutingEngine {
  private readonly recommendations = new RecommendationEngine();
  private readonly registry = new ModelRegistryService();
  private readonly providerConfigs = new ProviderConfigurationService();

  decide(request: RoutingRequest): RoutingDecision {
    const recommendation = this.recommendations.evaluate({
      prompt: request.prompt,
      currentProvider: request.currentProvider,
      currentModelId: request.currentModelId,
    });

    if (request.routingMode === "manual") {
      if (!request.selectedProvider || !request.selectedModelId) {
        throw badRequest("Manual routing requires a selected provider and model.");
      }

      const selected = this.registry.getByProviderAndModel(
        request.selectedProvider,
        request.selectedModelId,
      );

      if (!selected) {
        throw badRequest("Selected model is not registered.");
      }

      return {
        mode: "manual",
        provider: selected.provider,
        modelId: selected.modelId,
        modelDisplayName: selected.displayName,
        shouldAskToSwitch: false,
      };
    }

    if (request.routingMode === "suggest" && !request.acceptRecommendation) {
      const current =
        request.currentProvider && request.currentModelId
          ? this.registry.getByProviderAndModel(request.currentProvider, request.currentModelId)
          : this.registry.getDefaultModel();
      const fallback = current ?? this.registry.getDefaultModel();

      return {
        mode: "suggest",
        provider: fallback.provider,
        modelId: fallback.modelId,
        modelDisplayName: fallback.displayName,
        shouldAskToSwitch: recommendation.shouldAskToSwitch,
        recommendationReason: recommendation.reason,
      };
    }

    const recommended = this.registry.getByProviderAndModel(
      recommendation.recommendedProvider,
      recommendation.recommendedModel,
    );

    if (!recommended) {
      throw badRequest("Recommended model is not registered.");
    }

    return {
      mode: request.routingMode,
      provider: recommended.provider,
      modelId: recommended.modelId,
      modelDisplayName: recommended.displayName,
      shouldAskToSwitch: request.routingMode === "suggest" ? false : recommendation.shouldAskToSwitch,
      recommendationReason: recommendation.reason,
    };
  }

  async route(request: RoutingRequest) {
    const decision = this.decide(request);

    if (!isProviderId(decision.provider)) {
      throw badRequest("Unsupported provider.");
    }

    const runtimeConfig = await this.providerConfigs.getRuntimeConfig({
      provider: decision.provider,
      userId: request.userId,
      workspaceId: request.workspaceId,
    });
    const provider = createProvider(decision.provider, runtimeConfig);
    const selectedModel = this.registry.getByProviderAndModel(decision.provider, decision.modelId);
    let output: TextGenerationOutput;

    if (selectedModel?.imageGeneration && provider.generateImage) {
      const image = await provider.generateImage({
        prompt: request.prompt,
        modelId: decision.modelId,
      });
      const content = image.imageUrl
        ? `Generated image with ${decision.modelDisplayName}.\n\n![Generated image](${image.imageUrl})`
        : `${decision.modelDisplayName} is selected for image generation, but no image was returned. Confirm the provider key in Settings and try again.`;

      output = {
        content,
        modelId: decision.modelId,
        provider: decision.provider,
        tokenInputEstimate: Math.ceil(request.prompt.length / 4),
        tokenOutputEstimate: Math.ceil(content.length / 4),
      };
    } else {
      output = await provider.generateText({
        prompt: request.prompt,
        modelId: decision.modelId,
        context: request.context,
      });
    }

    return { decision, output };
  }
}
