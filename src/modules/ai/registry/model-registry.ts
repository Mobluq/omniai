import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export type CostTier = "low" | "medium" | "high" | "premium";
export type ProviderStatus = "available" | "disabled" | "degraded" | "beta";

export type ModelRegistryEntry = {
  provider: "openai" | "anthropic" | "google" | "stability" | "mistral";
  modelId: string;
  displayName: string;
  description: string;
  capabilities: ModelCapabilityId[];
  costTier: CostTier;
  speedRating: number;
  reasoningStrength: number;
  writingStrength: number;
  codingStrength: number;
  imageGeneration: boolean;
  contextWindowEstimate: number;
  status: ProviderStatus;
};

export const modelRegistry: ModelRegistryEntry[] = [
  {
    provider: "openai",
    modelId: "openai-chat-primary",
    displayName: "OpenAI Chat Primary",
    description: "General purpose reasoning, writing, coding, and tool-use ready chat model.",
    capabilities: [
      "text_generation",
      "code_generation",
      "reasoning",
      "function_calling",
      "business_writing",
      "summarization",
      "image_analysis",
    ],
    costTier: "medium",
    speedRating: 8,
    reasoningStrength: 9,
    writingStrength: 9,
    codingStrength: 8,
    imageGeneration: false,
    contextWindowEstimate: 128000,
    status: "available",
  },
  {
    provider: "openai",
    modelId: "openai-image-primary",
    displayName: "OpenAI Image Primary",
    description: "Primary OpenAI image generation and editing adapter.",
    capabilities: ["image_generation", "image_editing"],
    costTier: "high",
    speedRating: 7,
    reasoningStrength: 6,
    writingStrength: 6,
    codingStrength: 2,
    imageGeneration: true,
    contextWindowEstimate: 8000,
    status: "available",
  },
  {
    provider: "anthropic",
    modelId: "claude-primary",
    displayName: "Claude Primary",
    description: "Strong long-context reasoning, analysis, coding review, and writing model.",
    capabilities: [
      "text_generation",
      "code_generation",
      "long_context",
      "reasoning",
      "summarization",
      "business_writing",
      "creative_writing",
      "document_analysis",
    ],
    costTier: "medium",
    speedRating: 7,
    reasoningStrength: 9,
    writingStrength: 9,
    codingStrength: 8,
    imageGeneration: false,
    contextWindowEstimate: 200000,
    status: "available",
  },
  {
    provider: "google",
    modelId: "gemini-primary",
    displayName: "Gemini Primary",
    description: "Long-context multimodal model for research, summarization, and analysis.",
    capabilities: [
      "text_generation",
      "long_context",
      "research",
      "summarization",
      "data_analysis",
      "image_analysis",
      "reasoning",
    ],
    costTier: "low",
    speedRating: 8,
    reasoningStrength: 8,
    writingStrength: 7,
    codingStrength: 7,
    imageGeneration: false,
    contextWindowEstimate: 1000000,
    status: "available",
  },
  {
    provider: "stability",
    modelId: "stability-image-primary",
    displayName: "Stability Image Primary",
    description: "Image generation and editing adapter for creative visual workflows.",
    capabilities: ["image_generation", "image_editing"],
    costTier: "medium",
    speedRating: 8,
    reasoningStrength: 3,
    writingStrength: 3,
    codingStrength: 1,
    imageGeneration: true,
    contextWindowEstimate: 4000,
    status: "available",
  },
  {
    provider: "mistral",
    modelId: "mistral-primary",
    displayName: "Mistral Primary",
    description: "Efficient text, code, summarization, function calling, and embedding workflows.",
    capabilities: [
      "text_generation",
      "code_generation",
      "reasoning",
      "function_calling",
      "summarization",
      "embeddings",
    ],
    costTier: "low",
    speedRating: 9,
    reasoningStrength: 7,
    writingStrength: 7,
    codingStrength: 8,
    imageGeneration: false,
    contextWindowEstimate: 128000,
    status: "available",
  },
];

export class ModelRegistryService {
  list() {
    return modelRegistry;
  }

  getByProviderAndModel(provider: string, modelId: string) {
    return modelRegistry.find((model) => model.provider === provider && model.modelId === modelId);
  }

  getByCapability(capability: ModelCapabilityId) {
    return modelRegistry.filter(
      (model) => model.status === "available" && model.capabilities.includes(capability),
    );
  }

  getDefaultModel() {
    return modelRegistry[0]!;
  }
}
