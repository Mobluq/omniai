import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RecommendationEngine } from "@/modules/ai/recommendation/recommendation-engine";

describe("RecommendationEngine", () => {
  const engine = new RecommendationEngine();

  it("recommends an image-capable model for image generation", () => {
    const result = engine.evaluate({
      prompt: "Generate an image of a futuristic Lagos skyline",
      currentProvider: "openai",
      currentModelId: "openai-chat-primary",
    });

    assert.equal(result.detectedIntent, "image_generation");
    assert.ok(["openai", "stability"].includes(result.recommendedProvider));
    assert.equal(result.shouldAskToSwitch, true);
  });

  it("recommends a code-capable model for debugging work", () => {
    const result = engine.evaluate({
      prompt: "Debug this React component and explain the bug",
    });

    assert.equal(result.detectedIntent, "debugging");
    assert.ok(["openai", "anthropic", "mistral"].includes(result.recommendedProvider));
  });

  it("prefers long-context document models for board document analysis", () => {
    const result = engine.evaluate({
      prompt: "Summarize this long board document",
    });

    assert.equal(result.detectedIntent, "document_analysis");
    assert.ok(["anthropic", "google"].includes(result.recommendedProvider));
  });
});
