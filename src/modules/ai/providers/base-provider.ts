import type {
  EmbeddingInput,
  EmbeddingOutput,
  ImageGenerationInput,
  ImageGenerationOutput,
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";

export type ProviderConfig = {
  apiKey?: string;
};

export abstract class BaseProvider {
  abstract id: string;
  abstract name: string;
  abstract capabilities: ModelCapabilityId[];

  protected readonly apiKey?: string;

  protected constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey;
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    const contextNotice = input.context?.length
      ? ` I considered ${input.context.length} context item(s).`
      : "";

    return {
      content: `${this.name} adapter placeholder response for: "${input.prompt}".${contextNotice} Configure ${this.id.toUpperCase()} API credentials to enable live model calls.`,
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: estimateTokens(input.prompt),
      tokenOutputEstimate: 48,
    };
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    return {
      provider: this.id,
      modelId: input.modelId,
      revisedPrompt: input.prompt,
    };
  }

  async embedText(input: EmbeddingInput): Promise<EmbeddingOutput> {
    return {
      vector: [],
      dimensions: 0,
      provider: this.id,
      modelId: input.modelId,
    };
  }
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length * 1.3));
}
