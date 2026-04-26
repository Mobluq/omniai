import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ModelRegistryService } from "@/modules/ai/registry/model-registry";

describe("ModelRegistryService", () => {
  const registry = new ModelRegistryService();

  it("contains the initial provider families", () => {
    const providers = new Set(registry.list().map((model) => model.provider));

    assert.deepEqual(providers, new Set(["openai", "anthropic", "google", "stability", "mistral"]));
  });

  it("finds models by capability", () => {
    const imageModels = registry.getByCapability("image_generation");

    assert.ok(imageModels.length >= 2);
    assert.equal(
      imageModels.every((model) => model.imageGeneration),
      true,
    );
  });
});
