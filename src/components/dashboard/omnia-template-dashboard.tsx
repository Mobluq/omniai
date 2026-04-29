"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  FileStack,
  Gauge,
  Layers3,
  LockKeyhole,
  MessageSquarePlus,
  Route,
  SearchCheck,
  Settings2,
  Zap,
} from "@/components/ui/huge-icons";
import { ProviderLogo } from "@/components/integrations/provider-logo";
import { cn } from "@/lib/utils";

type ProviderConnection = {
  provider: string;
  displayName: string;
  envConfigured: boolean;
  workspaceConfigured: boolean;
  isEnabled: boolean;
  models: Array<{ modelId: string; displayName: string; capabilities: string[] }>;
};

type UsageRollup = {
  key: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  costEstimate: number;
};

type RecentConversation = {
  id: string;
  title: string;
  routingMode: string;
  activeProvider: string | null;
  activeModelId: string | null;
  updatedAt: string;
  lastMessage: string | null;
};

type RecentRecommendation = {
  id: string;
  detectedIntent: string;
  recommendedProvider: string;
  recommendedModelId: string;
  confidence: number;
  reason: string;
  routingMode: string;
  accepted: boolean | null;
  createdAt: string;
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
  usageByProvider: UsageRollup[];
  usageByTask: UsageRollup[];
  recentConversations: RecentConversation[];
  recentRecommendations: RecentRecommendation[];
};

type ProviderFilter = "all" | "connected" | "needs_key";
type RoutingLens = "suggest" | "auto" | "manual";

const statusColors = {
  intake: "#d85a49",
  classify: "#d85a49",
  review: "#c93a29",
  route: "#c93a29",
  blue: "#c93a29",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value);
}

function formatCapability(value: string) {
  return value.replaceAll("_", " ");
}

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function getProviderStatus(provider: ProviderConnection) {
  const keyConfigured = provider.envConfigured || provider.workspaceConfigured;

  if (provider.isEnabled && keyConfigured) {
    return {
      label: "Connected",
      tone: "green",
      detail: provider.envConfigured ? "Server key" : "Workspace key",
    };
  }

  if (provider.isEnabled) {
    return { label: "Needs key", tone: "amber", detail: "Enabled, no secret" };
  }

  return { label: "Disabled", tone: "neutral", detail: "Off by policy" };
}

function ProgressBar({ value, color = statusColors.route }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#e4eff1]">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  helper,
  href,
}: {
  label: string;
  value: string;
  helper: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full min-h-[9.75rem] flex-col justify-between rounded-[1.15rem] border border-[#c9d8dc] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#aebfc4] hover:shadow-[0_18px_44px_-32px_rgba(22,43,65,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c93a29]/30"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[#627177]">{label}</p>
        <ArrowRight
          className="h-4 w-4 text-[#7c8b91] transition group-hover:translate-x-0.5 group-hover:text-[#171314]"
          aria-hidden="true"
        />
      </div>
      <div>
        <p className="mt-4 font-mono text-[1.75rem] font-semibold tracking-[-0.06em] text-[#171314]">
          {value}
        </p>
        <p className="mt-3 text-xs leading-5 text-[#56666b]">{helper}</p>
      </div>
    </Link>
  );
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 shrink-0 rounded-xl px-3 text-sm font-medium transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c93a29]/30",
        active
          ? "bg-[#f6ded9] text-[#171314]"
          : "bg-[#edf7f9] text-[#56666b] hover:bg-[#e4eff1] hover:text-[#171314]",
      )}
    >
      {children}
    </button>
  );
}

function MobileRoutingSteps({ lens }: { lens: RoutingLens }) {
  const steps = [
    ["Prompt stored", "The user message is saved before a provider call.", statusColors.intake],
    ["Intent classified", "Task type, context need, and risk are scored.", statusColors.classify],
    [
      lens === "auto"
        ? "Best model selected"
        : lens === "manual"
          ? "Selected model checked"
          : "Switch suggested",
      lens === "auto"
        ? "The router can choose without pausing the conversation."
        : lens === "manual"
          ? "The system keeps the selected model but still records fit."
          : "The user sees why a better provider may help.",
      statusColors.review,
    ],
    [
      "Response logged",
      "Usage, model metadata, and memory hooks are recorded.",
      statusColors.route,
    ],
  ];

  return (
    <div className="grid gap-3 md:hidden">
      {steps.map(([title, body, color], index) => (
        <div key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
          <div className="grid justify-items-center">
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {index + 1}
            </span>
            {index < steps.length - 1 ? <span className="h-full w-px bg-[#c9d8dc]" /> : null}
          </div>
          <div className="pb-4">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[#56666b]">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoutingFlow({ lens }: { lens: RoutingLens }) {
  const decisionLabel =
    lens === "auto" ? "Auto route" : lens === "manual" ? "Respect selected model" : "Ask to switch";

  return (
    <div>
      <MobileRoutingSteps lens={lens} />
      <div className="thin-scrollbar hidden overflow-x-auto md:block">
        <svg
          viewBox="0 0 1060 270"
          className="dashboard-flow h-[270px] min-w-[980px] w-full"
          role="img"
          aria-label="OmniAI routing decision flow"
        >
          <defs>
            <linearGradient id="omni-route-main" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor={statusColors.intake} />
              <stop offset="27%" stopColor={statusColors.classify} />
              <stop offset="58%" stopColor={statusColors.review} />
              <stop offset="100%" stopColor={statusColors.route} />
            </linearGradient>
            <linearGradient id="omni-route-soft" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#f6ded9" />
              <stop offset="48%" stopColor="#ecc3bc" />
              <stop offset="100%" stopColor="#e4eff1" />
            </linearGradient>
          </defs>
          <path
            d="M38 128 C148 128 184 88 270 88 H376 C454 88 480 60 562 60 H674 C760 60 786 94 872 94 H1028"
            fill="none"
            stroke="url(#omni-route-soft)"
            strokeLinecap="round"
            strokeWidth="76"
            opacity="0.58"
          />
          <path
            d="M38 144 C148 144 184 176 270 176 H374 C454 176 482 202 562 202 H674 C760 202 786 170 872 170 H1028"
            fill="none"
            stroke="url(#omni-route-soft)"
            strokeLinecap="round"
            strokeWidth="68"
            opacity="0.34"
          />
          <path
            d="M38 136 C154 136 186 126 274 126 H378 C458 126 482 132 562 132 H674 C762 132 786 136 872 136 H1028"
            fill="none"
            stroke="url(#omni-route-main)"
            strokeLinecap="round"
            strokeWidth="54"
          />
          {[266, 530, 792].map((x) => (
            <path
              key={x}
              d={`M${x} 20 V248`}
              stroke="#aebfc4"
              strokeDasharray="4 8"
              opacity="0.72"
            />
          ))}
          {[
            ["Store prompt", 82, 138],
            ["Classify intent", 318, 138],
            [decisionLabel, 566, 138],
            ["Call provider + log usage", 820, 138],
          ].map(([label, x, y]) => (
            <g key={label}>
              <rect
                x={Number(x) - 18}
                y={Number(y) - 24}
                width="190"
                height="36"
                rx="18"
                fill="#171314"
                opacity="0.82"
              />
              <text x={x} y={y} fill="white" fontSize="13" fontWeight="600">
                {label}
              </text>
            </g>
          ))}
          <text x="86" y="68" fill="#56666b" fontSize="12">
            1. Data is tenant-scoped
          </text>
          <text x="332" y="66" fill="#56666b" fontSize="12">
            2. Capability matrix + context
          </text>
          <text x="586" y="66" fill="#56666b" fontSize="12">
            3. User or policy decision
          </text>
          <text x="824" y="66" fill="#56666b" fontSize="12">
            4. Evidence saved
          </text>
        </svg>
      </div>
    </div>
  );
}

function ProviderFeed({
  providers,
  filter,
}: {
  providers: ProviderConnection[];
  filter: ProviderFilter;
}) {
  const rows = providers.map((provider) => {
    const status = getProviderStatus(provider);
    const capabilities = Array.from(
      new Set(provider.models.flatMap((model) => model.capabilities)),
    ).slice(0, 3);

    return {
      provider,
      status,
      capabilities,
    };
  });
  const filteredRows = rows.filter((row) => {
    if (filter === "connected") {
      return row.status.tone === "green";
    }

    if (filter === "needs_key") {
      return row.status.tone !== "green";
    }

    return true;
  });

  if (!providers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#c9d8dc] p-5 text-sm text-[#56666b]">
        No providers are registered yet. Connect your first provider to activate model routing.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#c9d8dc]">
      {filteredRows.map(({ provider, status, capabilities }) => (
        <Link
          key={provider.provider}
          href="/settings"
          className="group/provider grid min-h-[4.75rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 transition hover:bg-[#edf7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c93a29]/30"
        >
          <div className="flex min-w-0 items-center gap-3">
            <ProviderLogo provider={provider.provider} className="h-9 w-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{provider.displayName}</span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {capabilities.length ? (
                  capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded bg-[#edf7f9] px-1.5 py-0.5 text-[0.65rem] capitalize text-[#627177]"
                    >
                      {formatCapability(capability)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#627177]">Capabilities pending</span>
                )}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                status.tone === "green"
                  ? "bg-[#f6ded9] text-[#8f2a20]"
                  : status.tone === "amber"
                    ? "bg-[#f6ded9] text-[#8f2a20]"
                    : "bg-[#edf7f9] text-[#627177]",
              )}
            >
              {status.label}
            </span>
            <ChevronRight className="h-4 w-4 text-[#7c8b91]" aria-hidden="true" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <div className="grid min-h-[12rem] place-items-center rounded-2xl border border-dashed border-[#c9d8dc] p-6 text-center">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#56666b]">{body}</p>
        <Link
          href={href}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171314] px-4 text-sm font-semibold text-white transition hover:bg-[#241c1b] active:translate-y-px"
        >
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function UsageByProvider({ rows }: { rows: UsageRollup[] }) {
  const max = Math.max(...rows.map((row) => row.requestCount), 1);

  if (!rows.length) {
    return (
      <EmptyState
        title="No metered calls yet"
        body="Start a routed conversation and this panel will show requests, failures, and cost by provider."
        href="/chat"
        action="Start routed chat"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((row) => {
        const failureRate = row.requestCount ? (row.failureCount / row.requestCount) * 100 : 0;
        return (
          <Link
            key={row.key}
            href="/usage"
            className="grid gap-3 rounded-2xl border border-[#c9d8dc] p-4 transition hover:border-[#aebfc4] hover:bg-[#edf7f9]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold capitalize">{row.key}</p>
                <p className="mt-1 text-xs text-[#56666b]">
                  {formatNumber(row.successCount)} successful / {formatNumber(row.failureCount)}{" "}
                  failed
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold">
                  {formatCurrency(row.costEstimate)}
                </p>
                <p className="text-xs text-[#627177]">{formatNumber(row.requestCount)} calls</p>
              </div>
            </div>
            <ProgressBar
              value={(row.requestCount / max) * 100}
              color={failureRate > 20 ? statusColors.review : statusColors.route}
            />
          </Link>
        );
      })}
    </div>
  );
}

function RecentWork({
  conversations,
  recommendations,
}: {
  conversations: RecentConversation[];
  recommendations: RecentRecommendation[];
}) {
  return (
    <section className="dashboard-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]">Recent Work</h2>
          <p className="mt-1 text-sm text-[#56666b]">
            Conversation history and routing decisions stay visible from the same workspace.
          </p>
        </div>
        <Link
          href="/chat"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#c9d8dc] bg-white px-3 text-sm font-semibold transition hover:bg-[#edf7f9]"
        >
          Open chat
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#627177]">
            Conversations
          </p>
          {conversations.length ? (
            <div className="divide-y divide-[#c9d8dc]">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/chat?conversationId=${conversation.id}`}
                  className="block py-3 transition hover:bg-[#edf7f9]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{conversation.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#56666b]">
                        {conversation.lastMessage ?? "No message preview yet."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-[#edf7f9] px-2 py-1 text-[0.68rem] font-semibold uppercase text-[#627177]">
                      {conversation.routingMode}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-[#6b797f]">
                    {conversation.activeProvider ?? "No provider yet"} /{" "}
                    {conversation.activeModelId ?? "No model selected"} /{" "}
                    {formatRelative(conversation.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No conversations yet"
              body="Create a conversation to test model recommendations, provider switching, and history."
              href="/chat"
              action="Create first chat"
            />
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#627177]">
            Recommendation audit
          </p>
          {recommendations.length ? (
            <div className="grid gap-3">
              {recommendations.map((recommendation) => (
                <Link
                  key={recommendation.id}
                  href="/routing"
                  className="rounded-2xl border border-[#c9d8dc] p-4 transition hover:border-[#aebfc4] hover:bg-[#edf7f9]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold capitalize">
                        {formatCapability(recommendation.detectedIntent)}
                      </p>
                      <p className="mt-1 text-xs text-[#56666b]">
                        {recommendation.recommendedProvider} / {recommendation.recommendedModelId}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold">
                      {Math.round(recommendation.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#56666b]">
                    {recommendation.reason}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recommendations logged"
              body="Send prompts in suggest or auto mode to build an auditable routing trail."
              href="/routing"
              action="Review routing setup"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function DecisionModelPanel() {
  const scoring = [
    ["Capability match", "Does the model support the task type?", 34],
    ["Context fit", "Can it hold the project memory and source material?", 23],
    ["Quality signal", "Reasoning, coding, writing, or image strength.", 21],
    ["Cost and speed", "Latency and price pressure for the workspace.", 14],
    ["Workspace policy", "Allowed providers, keys, and plan restrictions.", 8],
  ];

  return (
    <section className="dashboard-panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6ded9] text-[#c93a29]">
          <SearchCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]">How OmniAI Picks a Model</h2>
          <p className="mt-1 text-sm leading-6 text-[#56666b]">
            The first version is rule-based by design: explainable, testable, and ready to be
            upgraded with an LLM classifier once enough decision data exists.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {scoring.map(([label, description, weight]) => (
          <div key={label} className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-[#56666b]">{description}</p>
              </div>
              <span className="font-mono text-sm font-semibold">{weight}%</span>
            </div>
            <ProgressBar value={Number(weight)} color={statusColors.blue} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionQueue({
  connectedProviderCount,
  providerCount,
  knowledgeSourceCount,
  requestCount,
  failureCount,
}: {
  connectedProviderCount: number;
  providerCount: number;
  knowledgeSourceCount: number;
  requestCount: number;
  failureCount: number;
}) {
  const actions = [
    connectedProviderCount === 0
      ? {
          title: "Connect a provider key",
          body: "Routing cannot call real models until at least one provider is connected.",
          href: "/settings",
          icon: LockKeyhole,
          tone: "urgent",
        }
      : {
          title: "Provider mesh online",
          body: `${connectedProviderCount} of ${providerCount} providers can receive requests.`,
          href: "/settings",
          icon: CheckCircle2,
          tone: "good",
        },
    knowledgeSourceCount === 0
      ? {
          title: "Add workspace knowledge",
          body: "Files, URLs, or notes give every model the same business context.",
          href: "/knowledge",
          icon: FileStack,
          tone: "normal",
        }
      : {
          title: "Memory layer has sources",
          body: `${knowledgeSourceCount} source${knowledgeSourceCount === 1 ? "" : "s"} ready for retrieval and injection.`,
          href: "/knowledge",
          icon: Database,
          tone: "good",
        },
    requestCount === 0
      ? {
          title: "Run the first routed prompt",
          body: "Test suggest mode with image, coding, writing, and research prompts.",
          href: "/chat",
          icon: MessageSquarePlus,
          tone: "normal",
        }
      : {
          title: "Usage is being metered",
          body: `${formatNumber(requestCount)} request${requestCount === 1 ? "" : "s"} recorded in this workspace.`,
          href: "/usage",
          icon: Gauge,
          tone: "good",
        },
    failureCount > 0
      ? {
          title: "Review failed provider calls",
          body: `${formatNumber(failureCount)} failed call${failureCount === 1 ? "" : "s"} need inspection.`,
          href: "/usage",
          icon: CircleAlert,
          tone: "urgent",
        }
      : {
          title: "No failed calls in the window",
          body: "Provider failures will appear here with recovery links.",
          href: "/usage",
          icon: CheckCircle2,
          tone: "good",
        },
  ];

  return (
    <section className="dashboard-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]">Operations Queue</h2>
          <p className="mt-1 text-sm text-[#56666b]">
            The next useful actions, not generic activity.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#c9d8dc] bg-white px-3 text-sm font-semibold transition hover:bg-[#edf7f9]"
        >
          Settings
          <Settings2 className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 grid gap-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#c9d8dc] p-3 transition hover:border-[#aebfc4] hover:bg-[#edf7f9]"
          >
            <span
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl",
                action.tone === "urgent"
                  ? "bg-[#f6ded9] text-[#c93a29]"
                  : action.tone === "good"
                    ? "bg-[#f6ded9] text-[#8f2a20]"
                    : "bg-[#f6ded9] text-[#c93a29]",
              )}
            >
              <action.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{action.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[#56666b]">{action.body}</span>
            </span>
            <ChevronRight
              className="h-4 w-4 text-[#7c8b91] transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
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
  usageByProvider,
  usageByTask,
  recentConversations,
  recentRecommendations,
}: OmniTemplateDashboardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [routingLens, setRoutingLens] = useState<RoutingLens>("suggest");
  const connectedProviderCount = providers.filter((provider) => {
    const status = getProviderStatus(provider);
    return status.tone === "green";
  }).length;
  const successRate = requestCount ? Math.round((successCount / requestCount) * 100) : 0;
  const taskTotal = usageByTask.reduce((sum, row) => sum + row.requestCount, 0);

  const readinessScore = useMemo(() => {
    const providerScore = connectedProviderCount > 0 ? 35 : 0;
    const memoryScore = knowledgeSourceCount > 0 ? 20 : 0;
    const usageScore = requestCount > 0 ? 20 : 0;
    const recommendationScore = routingDecisionCount > 0 ? 15 : 0;
    const reliabilityScore =
      requestCount === 0 || failureCount === 0 ? 10 : Math.max(0, 10 - failureCount * 2);
    return providerScore + memoryScore + usageScore + recommendationScore + reliabilityScore;
  }, [
    connectedProviderCount,
    failureCount,
    knowledgeSourceCount,
    requestCount,
    routingDecisionCount,
  ]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.set([".dashboard-panel", ".dashboard-flow", ".metric-tile"], {
        willChange: "transform, opacity",
      });

      if (reduceMotion) {
        gsap.set([".dashboard-panel", ".dashboard-flow", ".metric-tile"], { clearProps: "all" });
        return;
      }

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".metric-tile", { y: 12, autoAlpha: 0, duration: 0.42, stagger: 0.035 })
        .from(".dashboard-panel", { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.04 }, "-=0.2")
        .from(
          ".dashboard-flow",
          { scaleX: 0.84, autoAlpha: 0, transformOrigin: "left center", duration: 0.72 },
          "-=0.28",
        );
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-[calc(100dvh-66px)] bg-[#edf7f9] px-3 py-4 sm:px-5 lg:px-8 lg:py-7"
    >
      <div className="mx-auto max-w-[1660px]">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="grid h-5 w-5 grid-cols-2 gap-1" aria-hidden="true">
                <span className="rounded-sm border border-[#7c8b91]" />
                <span className="rounded-sm border border-[#7c8b91]" />
                <span className="rounded-sm border border-[#7c8b91]" />
                <span className="rounded-sm border border-[#7c8b91]" />
              </span>
              <span className="text-[#6b797f]">Dashboards</span>
              <span className="text-[#7c8b91]">/</span>
              <span className="font-semibold">AI Operations</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#171314] sm:text-3xl">
              {workspaceName}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#56666b]">
              A control center for model readiness, routing decisions, usage, memory, and the next
              action your workspace should take.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171314] px-4 text-sm font-semibold text-white transition hover:bg-[#241c1b] active:translate-y-px"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              New routed chat
            </Link>
            <Link
              href="/settings"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#c9d8dc] bg-white px-4 text-sm font-semibold transition hover:bg-[#edf7f9] active:translate-y-px"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Connect provider
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            [
              "Readiness",
              `${readinessScore}%`,
              "Provider, memory, usage, and routing setup.",
              "/settings",
            ],
            [
              "Conversations",
              formatNumber(conversationsCount),
              "Stored history in this workspace.",
              "/chat",
            ],
            [
              "Routing checks",
              formatNumber(routingDecisionCount),
              "Auditable model recommendations.",
              "/routing",
            ],
            [
              "Connected providers",
              `${connectedProviderCount}/${providers.length || 0}`,
              "Server-side model access.",
              "/settings",
            ],
            [
              "Memory sources",
              formatNumber(knowledgeSourceCount),
              "Knowledge available for context injection.",
              "/knowledge",
            ],
            [
              "Estimated spend",
              formatCurrency(estimatedCost),
              `${successRate}% success rate in usage logs.`,
              "/usage",
            ],
          ].map(([label, value, helper, href]) => (
            <div key={label} className="metric-tile h-full">
              <MetricTile label={label} value={value} helper={helper} href={href} />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_440px]">
          <section className="dashboard-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[#c9d8dc] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.02em]">Live Routing Funnel</h2>
                <p className="mt-1 text-sm text-[#56666b]">
                  The core product behavior: store first, understand task, then route with evidence.
                </p>
              </div>
              <div className="thin-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                {(["suggest", "auto", "manual"] as const).map((lens) => (
                  <PillButton
                    key={lens}
                    active={routingLens === lens}
                    onClick={() => setRoutingLens(lens)}
                  >
                    {lens === "suggest" ? "Suggest" : lens === "auto" ? "Auto" : "Manual"}
                  </PillButton>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-4">
                {[
                  ["Manual mode", "User selects model; OmniAI records fit.", statusColors.intake],
                  [
                    "Suggest mode",
                    "Recommendation appears before switching.",
                    statusColors.classify,
                  ],
                  ["Auto mode", "Policy selects the best available model.", statusColors.review],
                  [
                    "Evidence log",
                    "Provider, confidence, usage, and outcome saved.",
                    statusColors.route,
                  ],
                ].map(([label, body, color]) => (
                  <div key={label} className="rounded-2xl border border-[#c9d8dc] p-4">
                    <span
                      className="block h-1.5 w-12 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <p className="mt-3 text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#56666b]">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <RoutingFlow lens={routingLens} />
              </div>
            </div>
          </section>

          <section className="dashboard-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.02em]">Provider Readiness</h2>
                <p className="mt-1 text-sm text-[#56666b]">
                  Every row opens the provider settings.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["connected", "Connected"],
                  ["needs_key", "Needs key"],
                ].map(([value, label]) => (
                  <PillButton
                    key={value}
                    active={providerFilter === value}
                    onClick={() => setProviderFilter(value as ProviderFilter)}
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <ProviderFeed providers={providers} filter={providerFilter} />
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(360px,0.75fr)]">
          <DecisionModelPanel />

          <section className="dashboard-panel p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6ded9] text-[#8f2a20]">
                <Route className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-[-0.02em]">Usage by Provider</h2>
                <p className="mt-1 text-sm text-[#56666b]">
                  Shows where model traffic and cost are actually going.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <UsageByProvider rows={usageByProvider} />
            </div>
          </section>

          <ActionQueue
            connectedProviderCount={connectedProviderCount}
            providerCount={providers.length}
            knowledgeSourceCount={knowledgeSourceCount}
            requestCount={requestCount}
            failureCount={failureCount}
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)]">
          <RecentWork conversations={recentConversations} recommendations={recentRecommendations} />

          <section className="dashboard-panel p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6ded9] text-[#8f2a20]">
                <Layers3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-[-0.02em]">Task Mix</h2>
                <p className="mt-1 text-sm text-[#56666b]">
                  Useful once limits, billing, and routing policy become plan-aware.
                </p>
              </div>
            </div>
            <div className="mt-6">
              {usageByTask.length ? (
                <div className="grid gap-4">
                  {usageByTask.map((row) => (
                    <Link
                      key={row.key}
                      href="/usage"
                      className="grid gap-2 rounded-2xl border border-[#c9d8dc] p-4 transition hover:border-[#aebfc4] hover:bg-[#edf7f9]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold capitalize">
                          {formatCapability(row.key)}
                        </p>
                        <p className="font-mono text-sm font-semibold">
                          {formatNumber(row.requestCount)}
                        </p>
                      </div>
                      <ProgressBar
                        value={taskTotal ? (row.requestCount / taskTotal) * 100 : 0}
                        color={statusColors.classify}
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No task mix yet"
                  body="OmniAI will group routing, text, image, and embedding requests after usage begins."
                  href="/chat"
                  action="Send a prompt"
                />
              )}
            </div>
            <div className="mt-6 rounded-2xl border border-[#c9d8dc] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf7f9] text-[#56666b]">
                  <Zap className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Artifacts saved</p>
                  <p className="mt-1 text-xs text-[#56666b]">
                    {formatNumber(artifactCount)} output{artifactCount === 1 ? "" : "s"} stored for
                    review or reuse.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="sr-only">
          Workspace {workspaceName}, {formatNumber(requestCount)} requests,{" "}
          {formatCurrency(estimatedCost)} estimated cost, {formatNumber(failureCount)} failed calls,{" "}
          {formatNumber(successCount)} successful calls, {connectedProviderCount} connected
          providers.
        </div>
      </div>
    </div>
  );
}
