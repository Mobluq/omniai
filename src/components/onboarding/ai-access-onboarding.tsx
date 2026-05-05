"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Route,
  ShieldCheck,
  Sparkles,
} from "@/components/ui/huge-icons";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { parseApiResponse, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type AIAccountMode = "managed" | "byok" | "hybrid";
type RoutingMode = "manual" | "suggest" | "auto";

type AccessOption = {
  id: AIAccountMode;
  eyebrow: string;
  title: string;
  body: string;
  bestFor: string;
  primary?: boolean;
  bullets: string[];
};

const accessOptions: AccessOption[] = [
  {
    id: "managed",
    eyebrow: "Recommended",
    title: "OmniAI Managed Credits",
    body: "One OmniAI subscription gives this workspace access to supported AI services. OmniAI pays provider invoices and meters credits in one place.",
    bestFor: "Teams that want one bill, no provider setup, and instant access.",
    primary: true,
    bullets: ["One subscription", "No provider keys to manage", "Central usage and limits"],
  },
  {
    id: "hybrid",
    eyebrow: "Flexible",
    title: "Managed + Your Keys",
    body: "Use OmniAI credits for everyday routing, then connect your own provider keys when you need custom accounts, enterprise limits, or dedicated billing.",
    bestFor: "Growing teams that want managed access with escape hatches.",
    bullets: ["Managed by default", "BYOK fallback", "Policy-controlled routing"],
  },
  {
    id: "byok",
    eyebrow: "Advanced",
    title: "Bring Your Own Keys",
    body: "Use API keys from your existing OpenAI, Claude, Gemini, Mistral, Stability, or Bedrock accounts. Provider usage is billed by those providers.",
    bestFor: "Enterprises with procurement, private quotas, or existing committed spend.",
    bullets: ["Provider-direct billing", "Workspace key vault", "More setup required"],
  },
];

export function AIAccessOnboarding({
  workspaceId,
  workspaceName,
  initialMode,
  initialRoutingMode,
  initialMemoryEnabled,
}: {
  workspaceId: string;
  workspaceName: string;
  initialMode: AIAccountMode;
  initialRoutingMode: RoutingMode;
  initialMemoryEnabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<AIAccountMode>(initialMode);
  const [routingMode, setRoutingMode] = useState<RoutingMode>(initialRoutingMode);
  const [memoryEnabled, setMemoryEnabled] = useState(initialMemoryEnabled);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => accessOptions.find((option) => option.id === mode) ?? accessOptions[0],
    [mode],
  );

  async function submit() {
    setSaving(true);
    try {
      await parseApiResponse(
        await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            aiAccountMode: mode,
            defaultRoutingMode: routingMode,
            memoryEnabled,
          }),
        }),
      );
      toast({
        title: "AI access preference saved",
        description:
          mode === "managed"
            ? "OmniAI managed credits will power this workspace."
            : mode === "hybrid"
              ? "Managed credits and connected keys are both available."
              : "Connect provider keys in Settings to start routing.",
        variant: "success",
      });
      router.push("/dashboard");
      router.refresh();
    } catch (submitError: unknown) {
      toast({
        title: "Onboarding could not be saved",
        description: errorMessage(submitError),
        variant: "error",
      });
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#edf7f9] px-3 py-4 text-[#171314] sm:px-5 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1480px] gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="dashboard-panel overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-[#c9d8dc] p-5 sm:p-7 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <AppLogo markClassName="h-11 w-11 rounded-xl" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f2a20]">
                How OmniAI access works
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Choose how {workspaceName} pays for AI.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#56666b] sm:text-base">
                OmniAI can include model access inside one subscription, or your workspace can route
                through provider accounts you already control. You can change this later in
                Settings.
              </p>
            </div>
            <div className="rounded-2xl border border-[#c9d8dc] bg-[#f7fbfc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#627177]">
                Current choice
              </p>
              <p className="mt-3 text-lg font-semibold">{selected.title}</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#56666b]">{selected.bestFor}</p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-7 xl:grid-cols-3">
            {accessOptions.map((option) => {
              const active = mode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    "group flex min-h-[24rem] flex-col rounded-[1.35rem] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c93a29]/20",
                    active
                      ? "border-[#c93a29] bg-[#f6ded9] shadow-[0_22px_60px_-42px_rgba(143,42,32,0.85)]"
                      : "border-[#c9d8dc] bg-white hover:-translate-y-0.5 hover:border-[#aebfc4]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      className={
                        active || option.primary ? "bg-[#c93a29] text-white" : "bg-[#edf7f9]"
                      }
                    >
                      {option.eyebrow}
                    </Badge>
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl border",
                        active
                          ? "border-[#c93a29]/30 bg-white/70"
                          : "border-[#c9d8dc] bg-[#edf7f9]",
                      )}
                    >
                      {option.id === "managed" ? (
                        <Sparkles className="h-4 w-4 text-[#c93a29]" aria-hidden="true" />
                      ) : option.id === "hybrid" ? (
                        <Route className="h-4 w-4 text-[#c93a29]" aria-hidden="true" />
                      ) : (
                        <KeyRound className="h-4 w-4 text-[#c93a29]" aria-hidden="true" />
                      )}
                    </span>
                  </div>
                  <h2 className="mt-8 text-xl font-semibold tracking-[-0.03em]">{option.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#56666b]">{option.body}</p>
                  <div className="mt-auto grid gap-2 pt-7">
                    {option.bullets.map((bullet) => (
                      <span key={bullet} className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-[#c93a29]" aria-hidden="true" />
                        {bullet}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <section className="operational-panel overflow-hidden rounded-[1.75rem] border border-white/10 p-5 text-[#f7fbfc] shadow-[0_28px_90px_rgba(20,31,33,0.18)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              What happens next
            </p>
            <div className="mt-6 grid gap-4">
              {[
                [
                  "Subscribe once",
                  "Managed credits are included with OmniAI plans and tracked per workspace.",
                ],
                [
                  "Route normally",
                  "OmniAI still recommends, switches, and logs the best model for each task.",
                ],
                [
                  "Control spend",
                  "Usage, limits, credits, and overage policy stay visible in Usage & Billing.",
                ],
              ].map(([title, body], index) => (
                <div key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/55">{body}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6ded9] text-[#c93a29]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Workspace defaults</h2>
                <p className="mt-1 text-sm leading-6 text-[#56666b]">
                  These can also change later, but this gives OmniAI a clean starting policy.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Routing behavior</span>
                <select
                  value={routingMode}
                  onChange={(event) => setRoutingMode(event.target.value as RoutingMode)}
                  className="h-11 rounded-xl border border-[#c9d8dc] bg-white px-3 text-sm outline-none transition focus:border-[#c93a29] focus:ring-4 focus:ring-[#c93a29]/15"
                >
                  <option value="suggest">Suggest before switching</option>
                  <option value="auto">Auto-route to the best model</option>
                  <option value="manual">Manual model selection</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-[#c9d8dc] bg-white p-3 text-sm">
                <span>
                  <span className="block font-semibold">Shared memory</span>
                  <span className="mt-1 block text-xs leading-5 text-[#56666b]">
                    Let OmniAI reuse workspace knowledge across providers.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={memoryEnabled}
                  onChange={(event) => setMemoryEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>

            <Button className="mt-5 w-full rounded-xl" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Continue to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </section>
        </aside>
      </div>
    </main>
  );
}
