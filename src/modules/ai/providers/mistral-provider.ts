import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type {
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";

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

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    if (!this.apiKey) {
      return this.placeholderTextOutput(input);
    }

    const prompt = this.buildPromptWithContext(input);
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL ?? "mistral-large-latest",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = payload.choices?.[0]?.message?.content?.trim() || "Mistral returned an empty response.";

    return {
      content,
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: payload.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4),
      tokenOutputEstimate: payload.usage?.completion_tokens ?? Math.ceil(content.length / 4),
    };
  }
}
