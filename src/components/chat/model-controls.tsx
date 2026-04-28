"use client";

import { Select } from "@/components/ui/select";
import { modelRegistry } from "@/modules/ai/registry/model-registry";
import { useChatStore, type RoutingMode } from "@/components/chat/chat-store";

export function ModelControls() {
  const { routingMode, selectedModel, setRoutingMode, setSelectedModel } = useChatStore();

  return (
    <div className="grid gap-3 border-b border-border/70 bg-card/95 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_190px]">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Model
        </span>
        <Select
          value={`${selectedModel.provider}:${selectedModel.modelId}`}
          onChange={(event) => {
            const [provider, modelId] = event.target.value.split(":");
            setSelectedModel({ provider, modelId });
          }}
        >
          {modelRegistry.map((model) => (
            <option
              key={`${model.provider}:${model.modelId}`}
              value={`${model.provider}:${model.modelId}`}
            >
              {model.displayName}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Routing
        </span>
        <Select
          value={routingMode}
          onChange={(event) => setRoutingMode(event.target.value as RoutingMode)}
        >
          <option value="manual">Manual</option>
          <option value="suggest">Suggest</option>
          <option value="auto">Auto</option>
        </Select>
      </label>
    </div>
  );
}
