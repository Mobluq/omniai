import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type {
  ImageGenerationInput,
  ImageGenerationOutput,
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";
import { throwProviderResponseError } from "@/modules/ai/providers/provider-errors";

export class StabilityProvider extends BaseProvider {
  id = "stability";
  name = "Stability AI";
  capabilities: ModelCapabilityId[] = ["image_generation", "image_editing"];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    if (!this.apiKey) {
      return this.placeholderTextOutput(input);
    }

    return {
      content: "Stability AI is an image provider in OmniAI. Use an image-generation prompt so the router can call the image endpoint.",
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: Math.ceil(input.prompt.length / 4),
      tokenOutputEstimate: 24,
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

    const formData = new FormData();
    formData.append("prompt", input.prompt);
    formData.append("output_format", "png");

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      await throwProviderResponseError("Stability AI", response);
    }

    const payload = (await response.json()) as { image?: string };

    return {
      provider: this.id,
      modelId: input.modelId,
      imageUrl: payload.image ? `data:image/png;base64,${payload.image}` : undefined,
      revisedPrompt: input.prompt,
    };
  }
}
