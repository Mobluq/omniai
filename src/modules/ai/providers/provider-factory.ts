import { AnthropicProvider } from "@/modules/ai/providers/anthropic-provider";
import { GeminiProvider } from "@/modules/ai/providers/gemini-provider";
import { MistralProvider } from "@/modules/ai/providers/mistral-provider";
import { OpenAIProvider } from "@/modules/ai/providers/openai-provider";
import { StabilityProvider } from "@/modules/ai/providers/stability-provider";
import type { AIProvider } from "@/modules/ai/providers/types";

export type ProviderId = "openai" | "anthropic" | "google" | "stability" | "mistral";

export function createProvider(providerId: ProviderId): AIProvider {
  switch (providerId) {
    case "openai":
      return new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
    case "anthropic":
      return new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });
    case "google":
      return new GeminiProvider({ apiKey: process.env.GOOGLE_AI_API_KEY });
    case "stability":
      return new StabilityProvider({ apiKey: process.env.STABILITY_API_KEY });
    case "mistral":
      return new MistralProvider({ apiKey: process.env.MISTRAL_API_KEY });
  }
}

export function isProviderId(value: string): value is ProviderId {
  return ["openai", "anthropic", "google", "stability", "mistral"].includes(value);
}
