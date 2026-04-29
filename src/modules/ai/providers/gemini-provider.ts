import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type {
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";
import { throwProviderResponseError } from "@/modules/ai/providers/provider-errors";

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

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    if (!this.apiKey) {
      return this.placeholderTextOutput(input);
    }

    const prompt = this.buildPromptWithContext(input);
    const model = process.env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: input.maxOutputTokens ?? 2048,
          },
        }),
      },
    );

    if (!response.ok) {
      await throwProviderResponseError("Gemini", response);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const content =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter((text): text is string => Boolean(text))
        .join("\n")
        .trim() || "Gemini returned an empty response.";

    return {
      content,
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: payload.usageMetadata?.promptTokenCount ?? Math.ceil(prompt.length / 4),
      tokenOutputEstimate: payload.usageMetadata?.candidatesTokenCount ?? Math.ceil(content.length / 4),
    };
  }
}
