import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type {
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";
import { throwProviderResponseError } from "@/modules/ai/providers/provider-errors";

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

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    if (!this.apiKey) {
      return this.placeholderTextOutput(input);
    }

    const prompt = this.buildPromptWithContext(input);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
        max_tokens: input.maxOutputTokens ?? 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      await throwProviderResponseError("Anthropic", response);
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content =
      payload.content
        ?.map((part) => (part.type === "text" ? part.text : undefined))
        .filter((text): text is string => Boolean(text))
        .join("\n")
        .trim() || "Claude returned an empty response.";

    return {
      content,
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: payload.usage?.input_tokens ?? Math.ceil(prompt.length / 4),
      tokenOutputEstimate: payload.usage?.output_tokens ?? Math.ceil(content.length / 4),
    };
  }
}
