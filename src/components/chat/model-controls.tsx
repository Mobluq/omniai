"use client";

import { Select } from "@/components/ui/select";
import { modelRegistry } from "@/modules/ai/registry/model-registry";
import { useChatStore, type RoutingMode } from "@/components/chat/chat-store";
import { cn } from "@/lib/utils";

const routingModes: Array<{ value: RoutingMode; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "suggest", label: "Suggest" },
  { value: "auto", label: "Auto" },
];

export function ModelControls() {
  const { routingMode, selectedModel, setRoutingMode, setSelectedModel } = useChatStore();

  return (
    <div className="grid gap-3 border-b border-border/70 bg-card/95 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
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
      <div className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Routing</span>
        <div className="grid min-w-0 grid-cols-3 rounded-xl border border-border/80 bg-muted/50 p-1 md:min-w-[260px]">
          {routingModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={cn(
                "h-9 min-w-0 rounded-lg px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                routingMode === mode.value
                  ? "bg-card text-foreground shadow-line"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
              onClick={() => setRoutingMode(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
