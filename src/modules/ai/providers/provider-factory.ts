import { AmazonProvider } from "@/modules/ai/providers/amazon-provider";
import { AnthropicProvider } from "@/modules/ai/providers/anthropic-provider";
import type { ProviderConfig } from "@/modules/ai/providers/base-provider";
import { GeminiProvider } from "@/modules/ai/providers/gemini-provider";
import { MistralProvider } from "@/modules/ai/providers/mistral-provider";
import { OpenAIProvider } from "@/modules/ai/providers/openai-provider";
import { StabilityProvider } from "@/modules/ai/providers/stability-provider";
import type { AIProvider, ProviderId } from "@/modules/ai/providers/types";
import { getServerEnv } from "@/lib/env/server";

export function createProvider(
  providerId: ProviderId,
  runtimeConfig: ProviderConfig = {},
): AIProvider {
  const env = getServerEnv();
  const allowEnvFallback = runtimeConfig.useEnvironmentFallback ?? true;

  switch (providerId) {
    case "openai":
      return new OpenAIProvider({
        ...runtimeConfig,
        apiKey: runtimeConfig.apiKey ?? (allowEnvFallback ? env.OPENAI_API_KEY : undefined),
      });
    case "anthropic":
      return new AnthropicProvider({
        ...runtimeConfig,
        apiKey: runtimeConfig.apiKey ?? (allowEnvFallback ? env.ANTHROPIC_API_KEY : undefined),
      });
    case "google":
      return new GeminiProvider({
        ...runtimeConfig,
        apiKey: runtimeConfig.apiKey ?? (allowEnvFallback ? env.GOOGLE_AI_API_KEY : undefined),
      });
    case "stability":
      return new StabilityProvider({
        ...runtimeConfig,
        apiKey: runtimeConfig.apiKey ?? (allowEnvFallback ? env.STABILITY_API_KEY : undefined),
      });
    case "mistral":
      return new MistralProvider({
        ...runtimeConfig,
        apiKey: runtimeConfig.apiKey ?? (allowEnvFallback ? env.MISTRAL_API_KEY : undefined),
      });
    case "amazon":
      return new AmazonProvider({
        ...runtimeConfig,
        aws: {
          region: runtimeConfig.aws?.region ?? (allowEnvFallback ? env.AWS_REGION : undefined),
          accessKeyId:
            runtimeConfig.aws?.accessKeyId ??
            (allowEnvFallback ? env.AWS_ACCESS_KEY_ID : undefined),
          secretAccessKey:
            runtimeConfig.aws?.secretAccessKey ??
            (allowEnvFallback ? env.AWS_SECRET_ACCESS_KEY : undefined),
          sessionToken:
            runtimeConfig.aws?.sessionToken ??
            (allowEnvFallback ? env.AWS_SESSION_TOKEN : undefined),
          modelId:
            runtimeConfig.aws?.modelId ?? (allowEnvFallback ? env.AWS_BEDROCK_MODEL_ID : undefined),
        },
      });
  }
}

export function isProviderId(value: string): value is ProviderId {
  return ["openai", "anthropic", "google", "stability", "mistral", "amazon"].includes(value);
}
