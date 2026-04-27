import { AmazonProvider } from "@/modules/ai/providers/amazon-provider";
import { AnthropicProvider } from "@/modules/ai/providers/anthropic-provider";
import type { ProviderConfig } from "@/modules/ai/providers/base-provider";
import { GeminiProvider } from "@/modules/ai/providers/gemini-provider";
import { MistralProvider } from "@/modules/ai/providers/mistral-provider";
import { OpenAIProvider } from "@/modules/ai/providers/openai-provider";
import { StabilityProvider } from "@/modules/ai/providers/stability-provider";
import type { AIProvider, ProviderId } from "@/modules/ai/providers/types";
import { getServerEnv } from "@/lib/env/server";

export function createProvider(providerId: ProviderId, runtimeConfig: ProviderConfig = {}): AIProvider {
  const env = getServerEnv();

  switch (providerId) {
    case "openai":
      return new OpenAIProvider({ ...runtimeConfig, apiKey: runtimeConfig.apiKey ?? env.OPENAI_API_KEY });
    case "anthropic":
      return new AnthropicProvider({ ...runtimeConfig, apiKey: runtimeConfig.apiKey ?? env.ANTHROPIC_API_KEY });
    case "google":
      return new GeminiProvider({ ...runtimeConfig, apiKey: runtimeConfig.apiKey ?? env.GOOGLE_AI_API_KEY });
    case "stability":
      return new StabilityProvider({ ...runtimeConfig, apiKey: runtimeConfig.apiKey ?? env.STABILITY_API_KEY });
    case "mistral":
      return new MistralProvider({ ...runtimeConfig, apiKey: runtimeConfig.apiKey ?? env.MISTRAL_API_KEY });
    case "amazon":
      return new AmazonProvider({
        ...runtimeConfig,
        aws: {
          region: runtimeConfig.aws?.region ?? env.AWS_REGION,
          accessKeyId: runtimeConfig.aws?.accessKeyId ?? env.AWS_ACCESS_KEY_ID,
          secretAccessKey: runtimeConfig.aws?.secretAccessKey ?? env.AWS_SECRET_ACCESS_KEY,
          sessionToken: runtimeConfig.aws?.sessionToken ?? env.AWS_SESSION_TOKEN,
          modelId: runtimeConfig.aws?.modelId ?? env.AWS_BEDROCK_MODEL_ID,
        },
      });
  }
}

export function isProviderId(value: string): value is ProviderId {
  return ["openai", "anthropic", "google", "stability", "mistral", "amazon"].includes(value);
}
