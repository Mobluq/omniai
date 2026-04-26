import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export class OpenAIProvider extends BaseProvider {
  id = "openai";
  name = "OpenAI";
  capabilities: ModelCapabilityId[] = [
    "text_generation",
    "code_generation",
    "image_generation",
    "image_editing",
    "image_analysis",
    "reasoning",
    "function_calling",
    "business_writing",
    "summarization",
    "embeddings",
  ];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }
}
