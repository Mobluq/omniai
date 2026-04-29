import assert from "node:assert/strict";
import { ModelRegistryService } from "@/modules/ai/registry/model-registry";
import { OpenAIProvider } from "@/modules/ai/providers/openai-provider";
import { RecommendationEngine } from "@/modules/ai/recommendation/recommendation-engine";
import { RoutingEngine } from "@/modules/ai/routing/routing-engine";

async function run() {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/omniai";
  process.env.NEXTAUTH_SECRET ??= "test-secret";
  process.env.NEXTAUTH_URL ??= "http://localhost:3000";

  const registry = new ModelRegistryService();
  const providers = new Set(registry.list().map((model) => model.provider));
  assert.deepEqual(
    providers,
    new Set(["openai", "anthropic", "google", "stability", "mistral", "amazon"]),
  );

  const imageModels = registry.getByCapability("image_generation");
  assert.ok(imageModels.length >= 2);
  assert.equal(
    imageModels.every((model) => model.imageGeneration),
    true,
  );

  const recommendations = new RecommendationEngine();
  const imageRecommendation = recommendations.evaluate({
    prompt: "Generate an image of a futuristic Lagos skyline",
    currentProvider: "openai",
    currentModelId: "openai-chat-primary",
  });
  assert.equal(imageRecommendation.detectedIntent, "image_generation");
  assert.deepEqual(imageRecommendation.requiredCapabilities, ["image_generation"]);
  assert.ok(imageRecommendation.scores[0]?.breakdown.capabilityMatch !== undefined);
  assert.ok(["openai", "stability"].includes(imageRecommendation.recommendedProvider));
  assert.equal(imageRecommendation.shouldAskToSwitch, true);

  const debuggingRecommendation = recommendations.evaluate({
    prompt: "Debug this React component and explain the bug",
  });
  assert.equal(debuggingRecommendation.detectedIntent, "debugging");
  assert.ok(["openai", "anthropic", "mistral"].includes(debuggingRecommendation.recommendedProvider));

  const documentRecommendation = recommendations.evaluate({
    prompt: "Summarize this long board document",
  });
  assert.equal(documentRecommendation.detectedIntent, "document_analysis");
  assert.ok(["anthropic", "google"].includes(documentRecommendation.recommendedProvider));

  const constrainedRecommendation = recommendations.evaluate({
    prompt: "Generate an image of a futuristic Lagos skyline",
    allowedProviders: ["openai"],
  });
  assert.equal(constrainedRecommendation.recommendedProvider, "openai");
  assert.equal(constrainedRecommendation.recommendedModel, "openai-image-primary");

  const routing = new RoutingEngine();
  const manualDecision = routing.decide({
    prompt: "Write a short proposal email",
    routingMode: "manual",
    selectedProvider: "anthropic",
    selectedModelId: "claude-primary",
  });
  assert.equal(manualDecision.provider, "anthropic");
  assert.equal(manualDecision.modelId, "claude-primary");
  assert.equal(manualDecision.shouldAskToSwitch, false);

  const suggestDecision = routing.decide({
    prompt: "Generate an image of a luxury fintech dashboard",
    routingMode: "suggest",
    currentProvider: "openai",
    currentModelId: "openai-chat-primary",
  });
  assert.equal(suggestDecision.shouldAskToSwitch, true);
  assert.match(suggestDecision.recommendationReason ?? "", /image generation/);

  const autoResult = await routing.route({
    prompt: "Generate an image of a luxury fintech dashboard",
    routingMode: "auto",
    allowedProviders: ["openai"],
  });
  assert.equal(autoResult.decision.provider, "openai");
  assert.match(autoResult.output.content, /image generation|no image was returned/i);

  assert.throws(
    () =>
      routing.decide({
        prompt: "Write a short proposal email",
        routingMode: "manual",
        selectedProvider: "anthropic",
        selectedModelId: "claude-primary",
        allowedProviders: ["openai"],
      }),
    /not connected or enabled/,
  );

  const originalFetch = globalThis.fetch;
  const requestedModels: string[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
    requestedModels.push(body.model ?? "");

    if (requestedModels.length === 1) {
      return new Response(
        JSON.stringify({ error: { message: "The model does not exist or you do not have access." } }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ output_text: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const openai = new OpenAIProvider({ apiKey: "test-key" });
    const output = await openai.generateText({
      prompt: "Say OK",
      modelId: "openai-chat-primary",
      maxOutputTokens: 16,
    });
    assert.equal(output.content, "OK");
    assert.equal(requestedModels.length, 2);
    assert.equal(requestedModels[1], "gpt-4o-mini");
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("All unit assertions passed.");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
