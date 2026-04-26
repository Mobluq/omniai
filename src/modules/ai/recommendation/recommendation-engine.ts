import { IntentClassifier, type DetectedIntent } from "@/modules/ai/recommendation/intent-classifier";
import {
  ModelRegistryService,
  type ModelRegistryEntry,
} from "@/modules/ai/registry/model-registry";
import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export type RecommendationRequest = {
  prompt: string;
  currentProvider?: string;
  currentModelId?: string;
  userPreferredProvider?: string;
  allowedProviders?: string[];
};

export type RecommendationResult = {
  detectedIntent: DetectedIntent;
  recommendedProvider: string;
  recommendedModel: string;
  recommendedModelDisplayName: string;
  confidence: number;
  reason: string;
  shouldAskToSwitch: boolean;
  scores: Array<{
    provider: string;
    modelId: string;
    score: number;
  }>;
};

const intentReason: Record<DetectedIntent, string> = {
  image_generation:
    "This request requires image generation, so an image-capable model is a better fit.",
  image_editing: "This request needs image editing support, so an image-editing provider is preferred.",
  coding: "This looks like a coding task, so a model with strong code generation is preferred.",
  debugging: "This looks like a debugging task, so code generation and reasoning strength matter most.",
  long_form_writing:
    "This looks like a long-form writing task, so writing quality and context window matter.",
  business_strategy:
    "This looks like strategy work, so reasoning and business writing strength matter.",
  research: "This looks like research, so long context and research-oriented capabilities matter.",
  summarization: "This looks like summarization, so long context and summarization support matter.",
  data_analysis: "This looks like data analysis, so analytical capability matters.",
  document_analysis:
    "This looks like document analysis, so long-context document understanding is preferred.",
  creative_writing: "This looks like creative writing, so writing strength matters.",
  business_writing: "This looks like business writing, so clarity and tone matter.",
  general_chat: "This is a general request, so a balanced chat model is appropriate.",
};

export class RecommendationEngine {
  private readonly classifier = new IntentClassifier();
  private readonly registry = new ModelRegistryService();

  evaluate(request: RecommendationRequest): RecommendationResult {
    const classification = this.classifier.classify(request.prompt);
    const allowedProviders = request.allowedProviders?.length
      ? new Set(request.allowedProviders)
      : undefined;

    const candidates = this.registry
      .list()
      .filter((model) => model.status === "available")
      .filter((model) => !allowedProviders || allowedProviders.has(model.provider));

    const scored = candidates
      .map((model) => ({
        model,
        score: this.scoreModel(model, classification.requiredCapabilities, request),
      }))
      .sort((left, right) => right.score - left.score);

    const winner = scored[0]?.model ?? this.registry.getDefaultModel();
    const currentMatches =
      winner.provider === request.currentProvider && winner.modelId === request.currentModelId;

    return {
      detectedIntent: classification.intent,
      recommendedProvider: winner.provider,
      recommendedModel: winner.modelId,
      recommendedModelDisplayName: winner.displayName,
      confidence: Number(Math.min(0.98, scored[0]?.score ?? 0.5).toFixed(2)),
      reason: `${intentReason[classification.intent]} ${winner.displayName} is currently the best registry match.`,
      shouldAskToSwitch: !currentMatches,
      scores: scored.slice(0, 5).map(({ model, score }) => ({
        provider: model.provider,
        modelId: model.modelId,
        score: Number(score.toFixed(3)),
      })),
    };
  }

  private scoreModel(
    model: ModelRegistryEntry,
    requiredCapabilities: ModelCapabilityId[],
    request: RecommendationRequest,
  ) {
    const capabilityScore =
      requiredCapabilities.filter((capability) => model.capabilities.includes(capability)).length /
      Math.max(requiredCapabilities.length, 1);
    const qualityScore =
      (model.reasoningStrength + model.writingStrength + model.codingStrength) / 30;
    const speedScore = model.speedRating / 10;
    const costScore = model.costTier === "low" ? 1 : model.costTier === "medium" ? 0.82 : 0.62;
    const preferenceScore = request.userPreferredProvider === model.provider ? 0.08 : 0;

    return (
      capabilityScore * 0.52 +
      qualityScore * 0.22 +
      speedScore * 0.14 +
      costScore * 0.08 +
      preferenceScore
    );
  }
}
