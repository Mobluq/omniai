import { BaseProvider, type ProviderConfig } from "@/modules/ai/providers/base-provider";
import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export class StabilityProvider extends BaseProvider {
  id = "stability";
  name = "Stability AI";
  capabilities: ModelCapabilityId[] = ["image_generation", "image_editing"];

  constructor(config: ProviderConfig = {}) {
    super(config);
  }
}
