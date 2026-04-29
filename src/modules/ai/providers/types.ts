export type ModelCapabilityId =
  | "text_generation"
  | "code_generation"
  | "image_generation"
  | "image_editing"
  | "image_analysis"
  | "long_context"
  | "research"
  | "summarization"
  | "data_analysis"
  | "document_analysis"
  | "creative_writing"
  | "business_writing"
  | "reasoning"
  | "function_calling"
  | "embeddings";

export type ProviderId = "openai" | "anthropic" | "google" | "stability" | "mistral" | "amazon";

export type TextGenerationInput = {
  prompt: string;
  modelId: string;
  context?: string[];
  temperature?: number;
  maxOutputTokens?: number;
};

export type TextGenerationOutput = {
  content: string;
  modelId: string;
  provider: string;
  tokenInputEstimate: number;
  tokenOutputEstimate: number;
};

export type ImageGenerationInput = {
  prompt: string;
  modelId: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type ImageGenerationOutput = {
  imageUrl?: string;
  provider: string;
  modelId: string;
  revisedPrompt?: string;
};

export type EmbeddingInput = {
  text: string;
  modelId: string;
};

export type EmbeddingOutput = {
  vector: number[];
  dimensions: number;
  provider: string;
  modelId: string;
};

export interface AIProvider {
  id: string;
  name: string;
  capabilities: ModelCapabilityId[];
  generateText(input: TextGenerationInput): Promise<TextGenerationOutput>;
  generateImage?(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
  embedText?(input: EmbeddingInput): Promise<EmbeddingOutput>;
}
