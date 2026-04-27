import { AnthropicProvider } from "@/modules/ai/providers/anthropic-provider";
import { GeminiProvider } from "@/modules/ai/providers/gemini-provider";
import { MistralProvider } from "@/modules/ai/providers/mistral-provider";
import { OpenAIProvider } from "@/modules/ai/providers/openai-provider";
import { StabilityProvider } from "@/modules/ai/providers/stability-provider";
import type { AIProvider } from "@/modules/ai/providers/types";
import { getServerEnv } from "@/lib/env/server";

export type ProviderId = "openai" | "anthropic" | "google" | "stability" | "mistral";

export function createProvider(providerId: ProviderId): AIProvider {
  const env = getServerEnv();

  switch (providerId) {
    case "openai":
      return new OpenAIProvider({ apiKey: env.OPENAI_API_KEY });
    case "anthropic":
      return new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY });
    case "google":
      return new GeminiProvider({ apiKey: env.GOOGLE_AI_API_KEY });
    case "stability":
      return new StabilityProvider({ apiKey: env.STABILITY_API_KEY });
    case "mistral":
      return new MistralProvider({ apiKey: env.MISTRAL_API_KEY });
  }
}

export function isProviderId(value: string): value is ProviderId {
  return ["openai", "anthropic", "google", "stability", "mistral"].includes(value);
}
