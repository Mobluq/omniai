import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export class MistralProvider extends BaseProvider {
  id = "mistral";
  name = "Mistral";
  capabilities: ModelCapabilityId[] = [
    "text_generation",
    "code_generation",
    "reasoning",
    "function_calling",
    "summarization",
    "embeddings",
  ];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }
}
