import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export class AnthropicProvider extends BaseProvider {
  id = "anthropic";
  name = "Anthropic Claude";
  capabilities: ModelCapabilityId[] = [
    "text_generation",
    "code_generation",
    "long_context",
    "reasoning",
    "summarization",
    "business_writing",
    "creative_writing",
    "document_analysis",
  ];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }
}
