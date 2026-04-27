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
  contextTokenEstimate?: number;
};

export type RecommendationScoreBreakdown = {
  capabilityMatch: number;
  quality: number;
  contextFit: number;
  speed: number;
  cost: number;
  preference: number;
  total: number;
};

export type RecommendationResult = {
  detectedIntent: DetectedIntent;
  classificationConfidence: number;
  requiredCapabilities: ModelCapabilityId[];
  recommendedProvider: string;
  recommendedModel: string;
  recommendedModelDisplayName: string;
  confidence: number;
  reason: string;
  shouldAskToSwitch: boolean;
  scores: Array<{
    provider: string;
    modelId: string;
    displayName: string;
    score: number;
    matchedCapabilities: ModelCapabilityId[];
    missingCapabilities: ModelCapabilityId[];
    breakdown: RecommendationScoreBreakdown;
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
      .map((model) => this.scoreModel(model, classification.intent, classification.requiredCapabilities, request))
      .sort((left, right) => right.breakdown.total - left.breakdown.total);

    const winner = scored[0]?.model ?? this.registry.getDefaultModel();
    const winnerScore = scored[0]?.breakdown.total ?? 0.5;
    const currentMatches =
      winner.provider === request.currentProvider && winner.modelId === request.currentModelId;

    return {
      detectedIntent: classification.intent,
      classificationConfidence: classification.confidence,
      requiredCapabilities: classification.requiredCapabilities,
      recommendedProvider: winner.provider,
      recommendedModel: winner.modelId,
      recommendedModelDisplayName: winner.displayName,
      confidence: Number(Math.min(0.98, winnerScore * 0.86 + classification.confidence * 0.14).toFixed(2)),
      reason: `${intentReason[classification.intent]} ${winner.displayName} is currently the best registry match.`,
      shouldAskToSwitch: !currentMatches,
      scores: scored.slice(0, 5).map(({ model, matchedCapabilities, missingCapabilities, breakdown }) => ({
        provider: model.provider,
        modelId: model.modelId,
        displayName: model.displayName,
        score: Number(breakdown.total.toFixed(3)),
        matchedCapabilities,
        missingCapabilities,
        breakdown: roundBreakdown(breakdown),
      })),
    };
  }

  private scoreModel(
    model: ModelRegistryEntry,
    intent: DetectedIntent,
    requiredCapabilities: ModelCapabilityId[],
    request: RecommendationRequest,
  ) {
    const matchedCapabilities = requiredCapabilities.filter((capability) =>
      model.capabilities.includes(capability),
    );
    const missingCapabilities = requiredCapabilities.filter(
      (capability) => !model.capabilities.includes(capability),
    );
    const capabilityScore = matchedCapabilities.length / Math.max(requiredCapabilities.length, 1);
    const qualityScore = qualityForIntent(model, intent);
    const contextScore = contextFitScore(model, requiredCapabilities, request.contextTokenEstimate);
    const speedScore = model.speedRating / 10;
    const costScore = model.costTier === "low" ? 1 : model.costTier === "medium" ? 0.82 : 0.62;
    const preferenceScore = request.userPreferredProvider === model.provider ? 1 : 0;
    const total =
      capabilityScore * 0.44 +
      qualityScore * 0.22 +
      contextScore * 0.1 +
      speedScore * 0.1 +
      costScore * 0.08 +
      preferenceScore * 0.06;

    return {
      model,
      matchedCapabilities,
      missingCapabilities,
      breakdown: {
        capabilityMatch: capabilityScore,
        quality: qualityScore,
        contextFit: contextScore,
        speed: speedScore,
        cost: costScore,
        preference: preferenceScore,
        total,
      },
    };
  }
}

function qualityForIntent(model: ModelRegistryEntry, intent: DetectedIntent) {
  if (intent === "coding" || intent === "debugging") {
    return (model.codingStrength * 0.65 + model.reasoningStrength * 0.35) / 10;
  }

  if (
    intent === "business_writing" ||
    intent === "creative_writing" ||
    intent === "long_form_writing"
  ) {
    return (model.writingStrength * 0.7 + model.reasoningStrength * 0.3) / 10;
  }

  if (intent === "image_generation" || intent === "image_editing") {
    return model.imageGeneration ? 0.92 : 0.15;
  }

  if (
    intent === "research" ||
    intent === "data_analysis" ||
    intent === "document_analysis" ||
    intent === "business_strategy"
  ) {
    return (model.reasoningStrength * 0.7 + model.writingStrength * 0.3) / 10;
  }

  return (model.reasoningStrength + model.writingStrength + model.codingStrength) / 30;
}

function contextFitScore(
  model: ModelRegistryEntry,
  requiredCapabilities: ModelCapabilityId[],
  contextTokenEstimate = 0,
) {
  const longContextRequired =
    requiredCapabilities.includes("long_context") ||
    requiredCapabilities.includes("document_analysis") ||
    contextTokenEstimate > 32000;
  const targetWindow = longContextRequired ? 200000 : 128000;
  const capacityScore = Math.min(model.contextWindowEstimate / targetWindow, 1);

  return longContextRequired ? capacityScore : Math.max(0.65, capacityScore);
}

function roundBreakdown(breakdown: RecommendationScoreBreakdown) {
  return {
    capabilityMatch: Number(breakdown.capabilityMatch.toFixed(3)),
    quality: Number(breakdown.quality.toFixed(3)),
    contextFit: Number(breakdown.contextFit.toFixed(3)),
    speed: Number(breakdown.speed.toFixed(3)),
    cost: Number(breakdown.cost.toFixed(3)),
    preference: Number(breakdown.preference.toFixed(3)),
    total: Number(breakdown.total.toFixed(3)),
  };
}
