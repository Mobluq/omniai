"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { Bot, BrainCircuit, ChevronRight, Code2, Globe2, Image, Sparkles } from "lucide-react";

type ProviderConnection = {
  provider: string;
  displayName: string;
  envConfigured: boolean;
  workspaceConfigured: boolean;
  isEnabled: boolean;
  models: Array<{ modelId: string; displayName: string; capabilities: string[] }>;
};

type OmniTemplateDashboardProps = {
  workspaceName: string;
  conversationsCount: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  routingDecisionCount: number;
  estimatedCost: number;
  knowledgeSourceCount: number;
  artifactCount: number;
  providers: ProviderConnection[];
};

const yellow = "#ffc414";
const orange = "#ff961e";
const red = "#ff4652";
const green = "#22aa5b";
const blue = "#5a9cff";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function Donut({
  segments,
  label,
}: {
  segments: Array<{ color: string; value: number }>;
  label?: string;
}) {
  const { stops, total } = segments.reduce(
    (accumulator, segment) => {
      const start = accumulator.total;
      const next = start + segment.value;
      return {
        total: next,
        stops: [...accumulator.stops, `${segment.color} ${start}% ${next}%`],
      };
    },
    { total: 0, stops: [] as string[] },
  );

  return (
    <span
      className="relative grid h-[3.15rem] w-[3.15rem] shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${stops.join(", ")}, #eef3f7 ${total}% 100%)` }}
      aria-label={label}
      role="img"
    >
      <span className="h-[2.28rem] w-[2.28rem] rounded-full bg-white" />
    </span>
  );
}

function TinyDonut({ ready }: { ready: boolean }) {
  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-full"
      style={{
        background: ready
          ? `conic-gradient(${green} 0 62%, ${yellow} 62% 82%, ${red} 82% 100%)`
          : `conic-gradient(${yellow} 0 30%, ${red} 30% 78%, #d7e2ea 78% 100%)`,
      }}
    >
      <span className="h-5 w-5 rounded-full bg-white" />
    </span>
  );
}

function TrendChart({ color, points }: { color: string; points: number[] }) {
  const max = Math.max(...points, 1);
  const coordinates = points.map((point, index) => ({
    x: 24 + index * 46,
    y: 118 - (point / max) * 82,
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <svg viewBox="0 0 300 146" className="h-[146px] w-full" role="img" aria-label="Trend chart">
      {[32, 62, 92, 122].map((y) => (
        <path key={y} d={`M24 ${y} H286`} stroke="#dfe8ef" strokeWidth="1" />
      ))}
      <path d="M24 122 H286" stroke="#c8d4de" strokeWidth="1.5" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      {coordinates.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r="5.5"
          fill={color}
          stroke="white"
          strokeWidth="3"
          className="chart-dot"
        />
      ))}
      {["05/01", "05/08", "05/15", "05/22", "05/29", "06/06"].map((label, index) => (
        <text key={label} x={28 + index * 48} y="142" fill="#8a95a3" fontSize="10">
          {label}
        </text>
      ))}
    </svg>
  );
}

function ActivityCard({
  title,
  value,
  color,
  trend,
  donutLabel,
  legend,
}: {
  title: string;
  value: string;
  color: string;
  trend: number[];
  donutLabel: string;
  legend: Array<{ label: string; value: string; color: string }>;
}) {
  return (
    <section className="dashboard-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[0.98rem] font-semibold tracking-[-0.02em]">{title}</h3>
        <div className="text-right">
          <p className="font-mono text-xl font-semibold tracking-[-0.05em]">{value}</p>
          <p className="text-[0.68rem] text-[#6f7b88]">Last 7 Days</p>
        </div>
      </div>
      <TrendChart color={color} points={trend} />
      <div className="mt-4 grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4">
        <div className="relative grid place-items-center">
          <Donut
            label={donutLabel}
            segments={[
              { color: `${color}33`, value: 22 },
              { color, value: 58 },
              { color: green, value: 16 },
            ]}
          />
          <div className="absolute text-center">
            <p className="text-[0.72rem] text-[#6f7b88]">{donutLabel}</p>
            <p className="font-mono text-sm font-semibold">{value}</p>
          </div>
        </div>
        <div className="grid gap-3">
          {legend.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-dashed border-[#dce6ee] pb-2 text-xs last:border-b-0 last:pb-0"
            >
              <span className="flex items-center gap-2 text-[#5d6875]">
                <span
                  className="h-3 w-3 rounded-[0.28rem]"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
              <span className="font-mono font-semibold text-[#111418]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BarStack({
  rows,
  legend,
}: {
  rows: Array<{ label: string; values: Array<{ color: string; value: number }> }>;
  legend: Array<{ label: string; color: string }>;
}) {
  return (
    <div>
      <div className="grid gap-6">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-5">
            <p className="truncate text-xs text-[#7b8794]">{row.label}</p>
            <div className="flex h-4 gap-1">
              {row.values.map((part, index) => (
                <span
                  key={`${row.label}-${part.color}-${index}`}
                  className="rounded-[0.22rem]"
                  style={{ width: `${part.value}%`, backgroundColor: part.color }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#5d6875]">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[0.25rem]" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OverallDecisionChart() {
  const series = [
    { color: blue, points: [15, 13, 14, 21, 27, 24, 20, 18], label: "Total decisions: 79" },
    { color: red, points: [9, 8, 10, 12, 13, 18, 15, 15], label: "Needs review: 42" },
    { color: green, points: [2, 3, 4, 6, 7, 5, 7, 6], label: "Auto-routed: 37" },
  ];

  return (
    <section className="dashboard-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-base font-semibold tracking-[-0.02em]">Overall AI Decisions</h3>
        <div className="flex flex-wrap gap-5 text-xs text-[#5d6875]">
          {series.map((item) => (
            <span key={item.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[0.25rem]" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox="0 0 760 300"
        className="mt-8 h-[300px] w-full"
        role="img"
        aria-label="Overall AI decision trend"
      >
        {[56, 116, 176, 236].map((y) => (
          <path key={y} d={`M70 ${y} H724`} stroke="#dfe8ef" strokeWidth="1" />
        ))}
        <path d="M70 236 H724" stroke="#c8d4de" />
        <text x="26" y="241" fill="#8995a3" fontSize="12">
          0
        </text>
        <text x="22" y="181" fill="#8995a3" fontSize="12">
          20
        </text>
        <text x="22" y="121" fill="#8995a3" fontSize="12">
          40
        </text>
        <text x="22" y="61" fill="#8995a3" fontSize="12">
          60
        </text>
        {series.map((item) => {
          const max = 32;
          const coordinates = item.points.map((point, index) => ({
            x: 70 + index * 88,
            y: 236 - (point / max) * 180,
          }));
          const path = coordinates
            .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
            .join(" ");

          return (
            <g key={item.label}>
              <path
                d={path}
                fill="none"
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />
              {coordinates.map((point) => (
                <circle
                  key={`${item.label}-${point.x}`}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={item.color}
                  stroke="white"
                  strokeWidth="3"
                  className="chart-dot"
                />
              ))}
            </g>
          );
        })}
        <g>
          <rect x="396" y="91" width="92" height="40" rx="6" fill="#323840" />
          <text x="413" y="116" fill="white" fontSize="14">
            2/06: 22
          </text>
        </g>
      </svg>
    </section>
  );
}

export function OmniTemplateDashboard({
  workspaceName,
  conversationsCount,
  requestCount,
  successCount,
  failureCount,
  routingDecisionCount,
  estimatedCost,
  knowledgeSourceCount,
  artifactCount,
  providers,
}: OmniTemplateDashboardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const connectedProviderCount = providers.filter(
    (provider) => provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured),
  ).length;
  const providerRows = useMemo(
    () =>
      providers.length
        ? providers.map((provider, index) => {
            const ready =
              provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured);
            return {
              name: provider.displayName.replace("OpenAI / ", ""),
              count: [39700, 17900, 8020, 4473, 1859, 317][index] ?? 128 + index * 41,
              ready,
              icon: [Sparkles, BrainCircuit, Globe2, Code2, Image, Bot][index] ?? Bot,
            };
          })
        : [
            { name: "OpenAI GPT", count: 39700, ready: true, icon: Sparkles },
            { name: "Claude", count: 17900, ready: true, icon: BrainCircuit },
            { name: "Gemini", count: 8020, ready: true, icon: Globe2 },
            { name: "Mistral", count: 4473, ready: false, icon: Code2 },
            { name: "Stability", count: 1859, ready: false, icon: Image },
            { name: "Bedrock", count: 317, ready: false, icon: Bot },
          ],
    [providers],
  );
  const metrics = [
    {
      label: "Prompt Intake",
      value: conversationsCount || 259,
      delta: "+8%",
      compare: requestCount ? Math.max(239, requestCount - 20) : 239,
    },
    {
      label: "Model Calls",
      value: requestCount || 15804,
      delta: "+11%",
      compare: requestCount ? Math.max(0, requestCount - 435) : 16239,
    },
    {
      label: "Routing Checks",
      value: routingDecisionCount || 30242,
      delta: "+23%",
      compare: routingDecisionCount ? Math.max(0, routingDecisionCount - 295) : 29847,
    },
    {
      label: "Context Matches",
      value: knowledgeSourceCount ? knowledgeSourceCount * 113 : 5657,
      delta: "+18%",
      compare: knowledgeSourceCount ? knowledgeSourceCount * 91 : 6823,
    },
    {
      label: "Outputs Saved",
      value: artifactCount ? artifactCount * 88 : 22097,
      delta: "+8%",
      compare: artifactCount ? artifactCount * 76 : 21387,
    },
  ];
  const progressTotal = Math.max(5600, requestCount + successCount + 2200);
  const progressDone = Math.max(2347, successCount || Math.round(progressTotal * 0.42));

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.set([".dashboard-panel", ".dashboard-flow", ".chart-dot"], {
        willChange: "transform, opacity",
      });

      if (reduceMotion) {
        gsap.set([".dashboard-panel", ".dashboard-flow", ".chart-dot"], { clearProps: "all" });
        return;
      }

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".dashboard-panel", { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.045 })
        .from(
          ".dashboard-flow",
          {
            scaleX: 0.78,
            autoAlpha: 0,
            transformOrigin: "left center",
            duration: 0.7,
            stagger: 0.08,
          },
          "-=0.38",
        )
        .from(
          ".chart-dot",
          { y: 10, autoAlpha: 0, duration: 0.36, stagger: { each: 0.018, from: "center" } },
          "-=0.34",
        );

      gsap.to(".status-pulse", {
        scale: 1.12,
        autoAlpha: 0.72,
        duration: 1.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
      });
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-[calc(100dvh-66px)] bg-[#f5f8fb] px-3 py-4 sm:px-5 lg:px-8 lg:py-7"
    >
      <div className="mx-auto max-w-[1720px]">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="grid h-5 w-5 grid-cols-2 gap-1">
              <span className="rounded-sm border border-[#9aa6b2]" />
              <span className="rounded-sm border border-[#9aa6b2]" />
              <span className="rounded-sm border border-[#9aa6b2]" />
              <span className="rounded-sm border border-[#9aa6b2]" />
            </span>
            <span className="text-[#9aa6b2]">Dashboards</span>
            <span className="text-[#9aa6b2]">/</span>
            <span className="font-semibold">AI Routing</span>
          </div>
          <div className="inline-flex h-9 w-fit items-center gap-2 rounded-xl border border-[#cfdbe5] bg-white px-3 text-sm">
            <span className="h-4 w-4 rounded border border-[#8a95a3]" />
            Last 14 Days
            <ChevronRight className="h-4 w-4 rotate-90 text-[#5d6875]" aria-hidden="true" />
          </div>
        </div>

        <section className="dashboard-panel overflow-hidden rounded-[1.35rem] border border-[#d8e5ed] bg-white">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_510px]">
            <div className="min-w-0 border-b border-[#e0e9f0] p-5 xl:border-b-0 xl:border-r">
              <div className="flex flex-col gap-4 border-b border-[#e0e9f0] pb-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-base font-semibold tracking-[-0.02em]">Live Routing Funnel</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-[#6f7b88]">Filter by</span>
                  {["Data Feeds", "Model Keys", "Memory Found", "Auto/Suggest"].map(
                    (filter, index) => (
                      <button
                        key={filter}
                        type="button"
                        className={`rounded-xl px-4 py-2 transition ${
                          index === 0
                            ? "bg-[#dcecff] text-[#111418]"
                            : "bg-[#f0f4f8] text-[#4f5a66]"
                        }`}
                      >
                        {filter}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-6 py-8 lg:grid-cols-5">
                {metrics.map((metric, index) => (
                  <div
                    key={metric.label}
                    className={`px-4 ${index > 2 ? "lg:border-l lg:border-dashed lg:border-[#d5e0e8]" : ""}`}
                  >
                    <p className="text-xs text-[#8a95a3]">{metric.label}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <p className="font-mono text-[1.55rem] font-semibold tracking-[-0.06em]">
                        {formatNumber(metric.value)}
                      </p>
                      <span className="text-xs font-semibold text-[#2f7cf6]">{metric.delta}</span>
                      <ChevronRight className="h-4 w-4 text-[#5d6875]" aria-hidden="true" />
                    </div>
                    <p className="mt-5 text-xs text-[#8a95a3]">Compared to last week</p>
                    <p className="mt-1 font-mono text-xs font-semibold">
                      {formatNumber(metric.compare)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="thin-scrollbar overflow-x-auto">
                <svg
                  viewBox="0 0 1070 250"
                  className="h-[250px] min-w-[980px] w-full"
                  role="img"
                  aria-label="Prompt routing funnel"
                >
                  <defs>
                    <linearGradient id="main-flow" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor={yellow} />
                      <stop offset="18%" stopColor={orange} />
                      <stop offset="55%" stopColor={red} />
                      <stop offset="79%" stopColor={green} />
                      <stop offset="100%" stopColor="#8adb58" />
                    </linearGradient>
                    <linearGradient id="flow-soft" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#ffe8ad" />
                      <stop offset="44%" stopColor="#ffb7b9" />
                      <stop offset="100%" stopColor="#bdebbf" />
                    </linearGradient>
                  </defs>
                  <path
                    className="dashboard-flow"
                    d="M20 106 C130 106 168 78 245 78 H355 C450 78 470 52 552 52 H668 C746 52 748 94 820 94 H1054"
                    fill="none"
                    stroke="url(#flow-soft)"
                    strokeLinecap="round"
                    strokeWidth="86"
                    opacity="0.5"
                  />
                  <path
                    className="dashboard-flow"
                    d="M20 124 C130 124 168 151 245 151 H352 C448 151 472 180 552 180 H670 C746 180 748 145 820 145 H1054"
                    fill="none"
                    stroke="url(#flow-soft)"
                    strokeLinecap="round"
                    strokeWidth="86"
                    opacity="0.42"
                  />
                  <path
                    className="dashboard-flow"
                    d="M20 115 C142 115 168 103 250 103 H356 C444 103 462 108 548 108 H672 C742 108 756 120 824 120 H1054"
                    fill="none"
                    stroke="url(#main-flow)"
                    strokeLinecap="round"
                    strokeWidth="62"
                    opacity="0.92"
                  />
                  {[240, 520, 762].map((x) => (
                    <path
                      key={x}
                      d={`M${x} 8 V230`}
                      stroke="#b8c6d1"
                      strokeDasharray="4 7"
                      opacity="0.72"
                    />
                  ))}
                  <text x="244" y="126" fill="white" fontSize="15" fontWeight="600">
                    Classify Prompt
                  </text>
                  <text x="472" y="126" fill="white" fontSize="15" fontWeight="600">
                    Recommend Model
                  </text>
                  <text x="720" y="126" fill="white" fontSize="15" fontWeight="600">
                    Execute + Memory
                  </text>
                </svg>
              </div>
            </div>

            <aside className="p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold tracking-[-0.02em]">
                  Monitored Model Feeds
                </h2>
                <div className="flex rounded-xl bg-[#eef3f7] p-1 text-sm">
                  <button type="button" className="rounded-lg px-4 py-2 text-[#6f7b88]">
                    Total Scanned
                  </button>
                  <button type="button" className="rounded-lg bg-[#cfe4ff] px-4 py-2 font-medium">
                    Relevant Found
                  </button>
                </div>
              </div>
              <div className="divide-y divide-[#dce6ee]">
                {providerRows.slice(0, 9).map((provider) => (
                  <div
                    key={provider.name}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#dcecff] text-[#5a9cff]">
                        <provider.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="truncate text-sm font-medium">{provider.name}</span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[#111418]"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="font-mono text-sm font-semibold">
                      {compact(provider.count)}
                    </span>
                    <TinyDonut ready={provider.ready} />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(360px,0.9fr)]">
          <ActivityCard
            title="Prompt Intake Activities"
            value="46K"
            color={yellow}
            trend={[185, 205, 210, 170, 180, 295]}
            donutLabel="Intake"
            legend={[
              { label: "Newly Found", value: "29%", color: yellow },
              { label: "Transitioned to Review", value: "18%", color: red },
              { label: "Auto-routed", value: "19%", color: green },
            ]}
          />
          <ActivityCard
            title="Needs Review Activities"
            value="5.6K"
            color={red}
            trend={[280, 320, 345, 306, 240, 188]}
            donutLabel="Review"
            legend={[
              { label: "Newly Found", value: "12%", color: red },
              { label: "Resolved", value: "68%", color: green },
            ]}
          />
          <ActivityCard
            title="Routed Activities"
            value="22K"
            color={green}
            trend={[310, 306, 288, 250, 242, 316]}
            donutLabel="Routed"
            legend={[
              { label: "Transitioned to Suggest", value: "7%", color: yellow },
              { label: "Transitioned to Review", value: "5%", color: red },
              { label: "Newly Completed", value: "78%", color: green },
            ]}
          />

          <div className="grid gap-4">
            <section className="dashboard-panel p-6">
              <h3 className="text-base font-semibold tracking-[-0.02em]">
                Routing Progress Tracker
              </h3>
              <div className="mt-6 text-center">
                <span className="font-mono text-3xl font-semibold tracking-[-0.06em]">
                  {formatNumber(progressDone)}
                </span>
                <span className="ml-2 text-xl text-[#9aa6b2]">/ {compact(progressTotal)}</span>
              </div>
              <div className="mt-4 h-7 overflow-hidden rounded-full bg-[#ffe7e9]">
                <div className="flex h-full w-[45%] items-center justify-end rounded-full bg-[#23aa5e] pr-3 text-xs font-semibold text-white">
                  45%
                  <span className="status-pulse ml-2 grid h-6 w-6 place-items-center rounded-full bg-white text-[#23aa5e]">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 text-center text-xs text-[#5d6875]">
                <span>Executed</span>
                <span>Needs Review</span>
              </div>
            </section>

            <section className="dashboard-panel p-6">
              <h3 className="text-base font-semibold tracking-[-0.02em]">Prompt Lifecycle Flow</h3>
              <svg
                viewBox="0 0 420 156"
                className="mt-5 h-[156px] w-full"
                role="img"
                aria-label="Prompt lifecycle flow"
              >
                <defs>
                  <linearGradient id="mini-flow-a" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor={yellow} />
                    <stop offset="52%" stopColor={red} />
                    <stop offset="100%" stopColor={green} />
                  </linearGradient>
                </defs>
                <path
                  className="dashboard-flow"
                  d="M32 76 C120 76 164 44 220 44 C292 44 302 20 390 20"
                  fill="none"
                  stroke="url(#mini-flow-a)"
                  strokeWidth="26"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                <path
                  className="dashboard-flow"
                  d="M32 76 C118 76 162 111 220 111 C294 111 312 138 390 138"
                  fill="none"
                  stroke="url(#mini-flow-a)"
                  strokeWidth="26"
                  strokeLinecap="round"
                  opacity="0.22"
                />
                <path
                  className="dashboard-flow"
                  d="M32 76 C118 78 164 75 220 75 C292 75 308 78 390 78"
                  fill="none"
                  stroke="url(#mini-flow-a)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <line x1="32" x2="32" y1="62" y2="91" stroke={yellow} strokeWidth="8" />
                <line x1="220" x2="220" y1="60" y2="92" stroke={red} strokeWidth="8" />
                <line x1="390" x2="390" y1="62" y2="92" stroke={green} strokeWidth="8" />
                <text x="45" y="82" fill="#111418" fontSize="12">
                  Intake
                </text>
                <text x="232" y="82" fill={red} fontSize="12">
                  Review
                </text>
              </svg>
            </section>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <OverallDecisionChart />
          <section className="dashboard-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold tracking-[-0.02em]">
                Top 10 Model Cost and Latency
              </h3>
              <div className="flex gap-5 text-xs text-[#5d6875]">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[0.25rem] bg-[#ff4652]" />
                  Cost pressure
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[0.25rem] bg-[#22aa5b]" />
                  Latency cleared
                </span>
              </div>
            </div>
            <BarStack
              rows={[
                {
                  label: "OpenAI",
                  values: [
                    { color: red, value: 47 },
                    { color: green, value: 36 },
                  ],
                },
                {
                  label: "Claude",
                  values: [
                    { color: red, value: 39 },
                    { color: green, value: 34 },
                  ],
                },
                {
                  label: "Gemini",
                  values: [
                    { color: red, value: 42 },
                    { color: green, value: 22 },
                  ],
                },
                {
                  label: "Mistral",
                  values: [
                    { color: red, value: 31 },
                    { color: green, value: 20 },
                  ],
                },
                {
                  label: "Bedrock",
                  values: [
                    { color: red, value: 29 },
                    { color: green, value: 17 },
                  ],
                },
                {
                  label: "Stability",
                  values: [
                    { color: red, value: 22 },
                    { color: green, value: 14 },
                  ],
                },
              ]}
              legend={[]}
            />
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="dashboard-panel p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.02em]">
                  Tasks by Complexity and Category
                </h3>
                <p className="mt-7 text-sm text-[#8a95a3]">Median Seconds</p>
                <p className="mt-1 font-mono text-4xl font-semibold tracking-[-0.06em]">22</p>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-[#5d6875]">
                {[
                  ["Image", yellow],
                  ["Code", orange],
                  ["Research", red],
                  ["Resolved", green],
                ].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-[0.25rem]"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <BarStack
              rows={[
                {
                  label: "0-1 min",
                  values: [
                    { color: yellow, value: 18 },
                    { color: orange, value: 18 },
                    { color: "#ff7c38", value: 24 },
                    { color: red, value: 33 },
                  ],
                },
                {
                  label: "1-10 min",
                  values: [
                    { color: yellow, value: 22 },
                    { color: orange, value: 13 },
                    { color: "#ff7c38", value: 8 },
                    { color: red, value: 22 },
                    { color: green, value: 13 },
                  ],
                },
                {
                  label: "10-60 min",
                  values: [
                    { color: yellow, value: 8 },
                    { color: orange, value: 8 },
                    { color: "#ff7c38", value: 9 },
                    { color: red, value: 22 },
                  ],
                },
                {
                  label: "60+ min",
                  values: [
                    { color: yellow, value: 11 },
                    { color: red, value: 6 },
                  ],
                },
              ]}
              legend={[]}
            />
          </section>

          <section className="dashboard-panel p-6">
            <h3 className="mb-10 text-base font-semibold tracking-[-0.02em]">
              Top 10 Providers by Capability
            </h3>
            <BarStack
              rows={[
                {
                  label: "Text",
                  values: [
                    { color: yellow, value: 20 },
                    { color: orange, value: 23 },
                    { color: "#ff7c38", value: 22 },
                    { color: red, value: 42 },
                  ],
                },
                {
                  label: "Reasoning",
                  values: [
                    { color: yellow, value: 26 },
                    { color: "#ff7c38", value: 21 },
                    { color: red, value: 21 },
                  ],
                },
                {
                  label: "Images",
                  values: [
                    { color: yellow, value: 9 },
                    { color: orange, value: 13 },
                    { color: green, value: 22 },
                  ],
                },
                {
                  label: "Code",
                  values: [
                    { color: yellow, value: 22 },
                    { color: orange, value: 18 },
                    { color: "#ff7c38", value: 21 },
                    { color: red, value: 29 },
                  ],
                },
                {
                  label: "Research",
                  values: [
                    { color: yellow, value: 35 },
                    { color: "#ff7c38", value: 17 },
                    { color: green, value: 18 },
                  ],
                },
                { label: "Data", values: [{ color: green, value: 35 }] },
              ]}
              legend={[
                { label: "Image", color: yellow },
                { label: "Code", color: orange },
                { label: "Research", color: "#ff7c38" },
                { label: "Review", color: red },
                { label: "Resolved", color: green },
              ]}
            />
          </section>
        </div>

        <div className="sr-only">
          Workspace {workspaceName}, {formatNumber(requestCount)} requests,{" "}
          {formatCurrency(estimatedCost)} estimated cost,
          {formatNumber(failureCount)} failed calls, {formatNumber(successCount)} successful calls,{" "}
          {connectedProviderCount} connected providers.
        </div>
      </div>
    </div>
  );
}
