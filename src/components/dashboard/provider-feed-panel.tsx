import Link from "next/link";
import { Bot, Braces, CloudCog, ExternalLink, Image, SearchCode, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProviderFeedPanelProps = {
  providers: Array<{
    provider: string;
    displayName: string;
    envConfigured: boolean;
    workspaceConfigured: boolean;
    isEnabled: boolean;
    status: "available" | "disabled" | "degraded" | "beta";
    models: Array<{
      modelId: string;
      displayName: string;
      description: string;
      capabilities: string[];
    }>;
  }>;
};

const providerIcons = {
  openai: Sparkles,
  anthropic: Braces,
  google: SearchCode,
  mistral: Bot,
  stability: Image,
  amazon: CloudCog,
};

function MiniDonut({ connected, coverage }: { connected: boolean; coverage: number }) {
  const green = "#22c66f";
  const yellow = "#f9c617";
  const red = "#ff4b55";
  const background = connected
    ? `conic-gradient(${green} 0 ${coverage}%, ${yellow} ${coverage}% ${Math.min(coverage + 16, 96)}%, ${red} ${Math.min(coverage + 16, 96)}% 100%)`
    : `conic-gradient(${yellow} 0 30%, ${red} 30% 74%, rgba(148,163,184,0.35) 74% 100%)`;

  return (
    <span
      className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full"
      style={{ background }}
    >
      <span className="h-[1.58rem] w-[1.58rem] rounded-full bg-card" />
    </span>
  );
}

export function ProviderFeedPanel({ providers }: ProviderFeedPanelProps) {
  const readyCount = providers.filter(
    (provider) => provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured),
  ).length;

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/95 shadow-line">
      <div className="flex flex-col gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Model provider mesh</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Provider readiness, model coverage, and routing availability in one scan.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-muted">Ready {readyCount}</Badge>
          <Badge className="bg-muted">Total {providers.length}</Badge>
        </div>
      </div>

      <div className="divide-y divide-border/70">
        {providers.map((provider) => {
          const Icon = providerIcons[provider.provider as keyof typeof providerIcons] ?? Bot;
          const connected =
            provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured);
          const capabilityCount = new Set(provider.models.flatMap((model) => model.capabilities))
            .size;
          const coverage = connected
            ? Math.min(88, 34 + provider.models.length * 8 + capabilityCount * 3)
            : Math.max(18, Math.min(42, capabilityCount * 5));
          const sourceLabel = provider.workspaceConfigured
            ? "Workspace key"
            : provider.envConfigured
              ? "Server key"
              : "No key";

          return (
            <Link
              key={provider.provider}
              href="/settings"
              className="grid gap-3 px-5 py-3.5 transition hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf3ff] text-[#3677c7] ring-1 ring-[#cfe2ff]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{provider.displayName}</p>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[0.68rem] font-semibold",
                        connected && "bg-[#e8f8ef] text-[#147a42]",
                        !connected && provider.status === "beta" && "bg-[#fff7db] text-[#87620a]",
                        !connected && provider.status !== "beta" && "bg-[#fff0f1] text-[#a62e38]",
                      )}
                    >
                      {connected ? "Routable" : provider.status === "beta" ? "Beta" : "Needs key"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {provider.models.length} models, {capabilityCount} capabilities, {sourceLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-sm font-semibold tabular-nums">{coverage}%</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">coverage</p>
                </div>
                <MiniDonut connected={connected} coverage={coverage} />
                <ExternalLink
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
