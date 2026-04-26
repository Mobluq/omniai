import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export class GeminiProvider extends BaseProvider {
  id = "google";
  name = "Google Gemini";
  capabilities: ModelCapabilityId[] = [
    "text_generation",
    "long_context",
    "research",
    "summarization",
    "data_analysis",
    "image_analysis",
    "reasoning",
  ];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }
}
