import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type {
  ModelCapabilityId,
  TextGenerationInput,
  TextGenerationOutput,
} from "@/modules/ai/providers/types";

export class AmazonProvider extends BaseProvider {
  id = "amazon";
  name = "Amazon Bedrock";
  capabilities: ModelCapabilityId[] = [
    "text_generation",
    "long_context",
    "reasoning",
    "summarization",
    "business_writing",
    "document_analysis",
  ];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    const region = this.aws?.region;
    const modelId = this.aws?.modelId ?? process.env.AWS_BEDROCK_MODEL_ID;

    if (!region || !modelId) {
      return this.placeholderTextOutput(input);
    }

    const client = new BedrockRuntimeClient({
      region,
      credentials:
        this.aws?.accessKeyId && this.aws.secretAccessKey
          ? {
              accessKeyId: this.aws.accessKeyId,
              secretAccessKey: this.aws.secretAccessKey,
              sessionToken: this.aws.sessionToken,
            }
          : undefined,
    });
    const prompt = this.buildPromptWithContext(input);
    const response = await client.send(
      new ConverseCommand({
        modelId,
        messages: [
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
      }),
    );
    const content =
      response.output?.message?.content
        ?.map((part) => part.text)
        .filter((text): text is string => Boolean(text))
        .join("\n")
        .trim() || "Amazon Bedrock returned an empty response.";

    return {
      content,
      modelId: input.modelId,
      provider: this.id,
      tokenInputEstimate: response.usage?.inputTokens ?? Math.ceil(prompt.length / 4),
      tokenOutputEstimate: response.usage?.outputTokens ?? Math.ceil(content.length / 4),
    };
  }
}
