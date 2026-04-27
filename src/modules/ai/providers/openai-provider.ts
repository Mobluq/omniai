import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type {
  ImageGenerationInput,
  ImageGenerationOutput,
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";

function extractOpenAIText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const response = payload as { output_text?: unknown; output?: unknown };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return null;
  }

  const parts = response.output.flatMap((item) => {
    if (typeof item !== "object" || item === null || !Array.isArray((item as { content?: unknown }).content)) {
      return [];
    }

    return (item as { content: Array<{ text?: unknown }> }).content
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string");
  });

  return parts.join("\n").trim() || null;
}

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

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    if (!this.apiKey) {
      return this.placeholderTextOutput(input);
    }

    const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini";
    const prompt = this.buildPromptWithContext(input);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;
    const content = extractOpenAIText(payload) ?? "OpenAI returned an empty response.";

    return {
      content,
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: Math.ceil(prompt.length / 4),
      tokenOutputEstimate: Math.ceil(content.length / 4),
    };
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    if (!this.apiKey) {
      return {
        provider: this.id,
        modelId: input.modelId,
        revisedPrompt: input.prompt,
      };
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt: input.prompt,
        size: input.size ?? "1024x1024",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI image request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
    };
    const image = payload.data?.[0];

    return {
      provider: this.id,
      modelId: input.modelId,
      imageUrl: image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : undefined),
      revisedPrompt: image?.revised_prompt ?? input.prompt,
    };
  }
}
