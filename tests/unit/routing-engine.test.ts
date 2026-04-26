import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RoutingEngine } from "@/modules/ai/routing/routing-engine";

describe("RoutingEngine", () => {
  const routing = new RoutingEngine();

  it("uses the selected model in manual mode", () => {
    const decision = routing.decide({
      prompt: "Write a short proposal email",
      routingMode: "manual",
      selectedProvider: "anthropic",
      selectedModelId: "claude-primary",
    });

    assert.equal(decision.provider, "anthropic");
    assert.equal(decision.modelId, "claude-primary");
    assert.equal(decision.shouldAskToSwitch, false);
  });

  it("pauses in suggest mode when a stronger model is available", () => {
    const decision = routing.decide({
      prompt: "Generate an image of a luxury fintech dashboard",
      routingMode: "suggest",
      currentProvider: "openai",
      currentModelId: "openai-chat-primary",
    });

    assert.equal(decision.shouldAskToSwitch, true);
    assert.match(decision.recommendationReason ?? "", /image generation/);
  });

  it("routes automatically to the recommended model in auto mode", async () => {
    const result = await routing.route({
      prompt: "Generate an image of a luxury fintech dashboard",
      routingMode: "auto",
    });

    assert.ok(["openai", "stability"].includes(result.decision.provider));
    assert.match(result.output.content, /adapter placeholder response/);
  });
});
