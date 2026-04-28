import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Database,
  FileText,
  MessageSquareText,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RoutingFunnelProps = {
  conversationsCount: number;
  routingDecisionCount: number;
  connectedProviderCount: number;
  providerCount: number;
  knowledgeSourceCount: number;
  artifactCount: number;
  successCount: number;
  failureCount: number;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

export function RoutingFunnel({
  conversationsCount,
  routingDecisionCount,
  connectedProviderCount,
  providerCount,
  knowledgeSourceCount,
  artifactCount,
  successCount,
  failureCount,
}: RoutingFunnelProps) {
  const requestCount = successCount + failureCount;
  const routeSuccessRate = percentage(successCount, requestCount);
  const providerCoverage = percentage(connectedProviderCount, Math.max(providerCount, 1));
  const fitScore = connectedProviderCount
    ? Math.min(96, 54 + connectedProviderCount * 7 + Math.min(routingDecisionCount, 28))
    : 32;
  const reviewShare = Math.max(8, Math.min(38, 100 - fitScore));

  const stats = [
    {
      label: "Prompt capture",
      value: formatCompact(conversationsCount),
      helper: "threads",
      icon: MessageSquareText,
      tone: "yellow",
    },
    {
      label: "Intent checks",
      value: formatCompact(routingDecisionCount),
      helper: "recommendations",
      icon: Route,
      tone: "red",
    },
    {
      label: "Provider coverage",
      value: `${providerCoverage}%`,
      helper: `${connectedProviderCount}/${providerCount} ready`,
      icon: BrainCircuit,
      tone: "green",
    },
    {
      label: "Memory sources",
      value: formatCompact(knowledgeSourceCount),
      helper: "context inputs",
      icon: Database,
      tone: "green",
    },
    {
      label: "Saved outputs",
      value: formatCompact(artifactCount),
      helper: "artifacts",
      icon: FileText,
      tone: "yellow",
    },
  ];

  return (
    <section className="operational-panel overflow-hidden rounded-[1.75rem] border border-white/10 text-[#f2f7f4] shadow-[0_28px_90px_rgba(20,31,33,0.28)]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-[-0.01em] sm:text-lg">
                Live routing funnel
              </h2>
              <span className="grid h-5 w-5 place-items-center rounded-full border border-white/20 text-[0.68rem] text-white/60">
                i
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
              How prompts move from capture through intent classification, provider selection,
              memory context, and saved output.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-md bg-white/10 px-3 py-2 text-white/70">Suggest mode</span>
            <span className="rounded-md bg-white/10 px-3 py-2 text-white/70">
              Auto-ready providers
            </span>
            <span className="rounded-md bg-white/10 px-3 py-2 text-white/70">Last 30 days</span>
          </div>
        </div>
      </div>

      <div className="grid border-b border-white/10 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-white/10 p-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/50">
                {stat.label}
              </p>
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg border",
                  stat.tone === "green" && "border-[#21d878]/25 bg-[#21d878]/10 text-[#31e184]",
                  stat.tone === "yellow" && "border-[#ffd426]/25 bg-[#ffd426]/10 text-[#ffd426]",
                  stat.tone === "red" && "border-[#ff4352]/25 bg-[#ff4352]/10 text-[#ff5361]",
                )}
              >
                <stat.icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-5 font-mono text-2xl font-semibold tracking-[-0.04em]">{stat.value}</p>
            <p className="mt-1 text-xs text-white/50">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="thin-scrollbar overflow-x-auto">
          <div className="relative min-w-[920px] px-6 py-8">
            <div className="absolute left-[27%] top-[4.6rem] rounded-lg border border-white/10 bg-[#232b2e]/95 px-3 py-2 text-sm font-medium shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#ffd426]" />
              Intent classified
              <span className="mx-2 text-white/50">to</span>
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#ff4352]" />
              Review needed {reviewShare}%
            </div>
            <svg
              viewBox="0 0 1060 330"
              className="h-[330px] w-full"
              role="img"
              aria-label="OmniAI routing funnel from prompt capture to routed, review, and saved output states"
            >
              <defs>
                <linearGradient id="funnel-yellow-red" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#ffd426" />
                  <stop offset="48%" stopColor="#ff982a" />
                  <stop offset="100%" stopColor="#ff4352" />
                </linearGradient>
                <linearGradient id="funnel-yellow-green" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#ffd426" />
                  <stop offset="42%" stopColor="#7cc943" />
                  <stop offset="100%" stopColor="#08d96f" />
                </linearGradient>
                <linearGradient id="funnel-red-green" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#ff4352" />
                  <stop offset="54%" stopColor="#bf8f45" />
                  <stop offset="100%" stopColor="#08d96f" />
                </linearGradient>
                <linearGradient id="funnel-green-yellow" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#08d96f" />
                  <stop offset="64%" stopColor="#94c83e" />
                  <stop offset="100%" stopColor="#ffd426" />
                </linearGradient>
              </defs>

              <line
                x1="88"
                x2="88"
                y1="134"
                y2="214"
                stroke="#ffd426"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="472"
                x2="472"
                y1="74"
                y2="154"
                stroke="#ff4352"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="472"
                x2="472"
                y1="210"
                y2="290"
                stroke="#08d96f"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="870"
                x2="870"
                y1="42"
                y2="122"
                stroke="#08d96f"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="870"
                x2="870"
                y1="150"
                y2="230"
                stroke="#ffd426"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="870"
                x2="870"
                y1="252"
                y2="318"
                stroke="#ff4352"
                strokeWidth="12"
                strokeLinecap="round"
              />

              <path
                d="M95 174 C240 174 274 108 430 108 C588 108 628 92 760 72 C804 66 834 66 862 66"
                fill="none"
                stroke="url(#funnel-yellow-red)"
                strokeLinecap="round"
                strokeWidth="34"
                opacity="0.9"
              />
              <path
                d="M95 174 C246 178 284 234 430 250 C568 266 650 248 756 198 C802 178 832 188 862 190"
                fill="none"
                stroke="url(#funnel-yellow-green)"
                strokeLinecap="round"
                strokeWidth="32"
                opacity="0.78"
              />
              <path
                d="M484 112 C608 112 654 130 742 176 C800 206 832 196 862 190"
                fill="none"
                stroke="url(#funnel-red-green)"
                strokeLinecap="round"
                strokeWidth="30"
                opacity="0.72"
              />
              <path
                d="M484 250 C626 250 656 226 748 188 C798 168 830 184 862 190"
                fill="none"
                stroke="url(#funnel-green-yellow)"
                strokeLinecap="round"
                strokeWidth="30"
                opacity="0.74"
              />
              <path
                d="M484 250 C620 252 686 302 862 286"
                fill="none"
                stroke="url(#funnel-red-green)"
                strokeLinecap="round"
                strokeWidth="30"
                opacity="0.62"
              />

              <text x="900" y="56" fill="rgba(242,247,244,0.68)" fontSize="16" fontWeight="600">
                Routed automatically
              </text>
              <text x="900" y="83" fill="#f2f7f4" fontSize="22" fontWeight="700">
                {fitScore}%
              </text>
              <text x="900" y="170" fill="rgba(242,247,244,0.68)" fontSize="16" fontWeight="600">
                Suggested switch
              </text>
              <text x="900" y="197" fill="#f2f7f4" fontSize="22" fontWeight="700">
                {Math.max(0, 100 - fitScore - reviewShare)}%
              </text>
              <text x="900" y="270" fill="rgba(242,247,244,0.68)" fontSize="16" fontWeight="600">
                Needs review
              </text>
              <text x="900" y="297" fill="#f2f7f4" fontSize="22" fontWeight="700">
                {reviewShare}%
              </text>
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#ffd426]" />
              Captured
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#ff4352]" />
              Review
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#08d96f]" />
              Routed
            </span>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/routing">
              Open routing console
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-3">
          <div className="p-4 sm:border-r sm:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Execution quality
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold">{routeSuccessRate}%</p>
            <p className="mt-1 text-xs text-white/50">
              {formatCompact(successCount)} successful provider calls
            </p>
          </div>
          <div className="p-4 sm:border-r sm:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Context depth
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold">
              {knowledgeSourceCount + artifactCount}
            </p>
            <p className="mt-1 text-xs text-white/50">memory inputs plus saved outputs</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Provider mesh
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold">
              {connectedProviderCount}/{providerCount}
            </p>
            <p className="mt-1 text-xs text-white/50">available to model router</p>
          </div>
        </div>
      </div>
    </section>
  );
}
