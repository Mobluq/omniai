import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { BillingActions } from "@/components/billing/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { UsageService } from "@/modules/usage/usage-service";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function UsageTrendPanel({
  daily,
  providerCount,
  requestCount,
  costEstimate,
}: {
  daily: Array<{
    date: string;
    requestCount: number;
    successCount: number;
    failureCount: number;
    costEstimate: number;
  }>;
  providerCount: number;
  requestCount: number;
  costEstimate: number;
}) {
  const points = daily.length
    ? daily.slice(-8).map((day) => day.requestCount)
    : [0, 1, 0, 2, 1, 3, 2, 4];
  const max = Math.max(...points, 1);
  const coordinates = points.map((point, index) => ({
    x: 28 + index * 70,
    y: 190 - (point / max) * 120,
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <section className="operational-panel mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 text-[#f2f7f4] shadow-[0_28px_90px_rgba(20,31,33,0.22)]">
      <div className="grid gap-6 border-b border-white/10 p-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Usage visibility
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
            Request, token, provider, and cost movement
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            The billing layer is prepared for provider-by-provider limits, subscription enforcement,
            and future live cost benchmarking.
          </p>
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center">
          {[
            ["Requests", formatNumber(requestCount)],
            ["Providers", formatNumber(providerCount)],
            ["Cost", formatCurrency(costEstimate)],
          ].map(([label, value]) => (
            <div key={label} className="border-r border-white/10 p-4 last:border-r-0">
              <p className="font-mono text-xl font-semibold tracking-[-0.05em]">{value}</p>
              <p className="mt-1 text-xs text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="thin-scrollbar overflow-x-auto p-5 lg:p-6">
        <svg
          viewBox="0 0 560 230"
          className="h-[230px] min-w-[620px] w-full"
          role="img"
          aria-label="Usage trend over the current billing window"
        >
          <defs>
            <linearGradient id="usage-line" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#ffd426" />
              <stop offset="45%" stopColor="#ff6f42" />
              <stop offset="100%" stopColor="#09d970" />
            </linearGradient>
            <linearGradient id="usage-fill" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,212,38,0.28)" />
              <stop offset="100%" stopColor="rgba(9,217,112,0.03)" />
            </linearGradient>
          </defs>
          <path d="M28 190 H538" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <path
            d="M28 142 H538"
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 7"
            strokeWidth="1"
          />
          <path
            d="M28 94 H538"
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 7"
            strokeWidth="1"
          />
          <path
            d="M28 46 H538"
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 7"
            strokeWidth="1"
          />
          <path
            d={`${path} L ${coordinates.at(-1)?.x ?? 538} 190 L 28 190 Z`}
            fill="url(#usage-fill)"
          />
          <path
            d={path}
            fill="none"
            stroke="url(#usage-line)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
          />
          {coordinates.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r="7"
              fill={index === coordinates.length - 1 ? "#09d970" : "#ffd426"}
              stroke="#20282a"
              strokeWidth="4"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

export default async function UsagePage() {
  const user = await requireUser();
  const workspaces = await new WorkspaceService().listForUser(user.id);
  const workspace = workspaces[0];

  if (!workspace) {
    return (
      <AppShell>
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          Create a workspace before usage can be tracked.
        </div>
      </AppShell>
    );
  }

  const summary = await new UsageService().summarize(workspace.id, 30);
  const totalTokens = summary.tokenInputEstimate + summary.tokenOutputEstimate;

  return (
    <AppShell>
      <div className="page-shell mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="page-kicker">Metering</p>
          <h1 className="page-title mt-2">Usage</h1>
          <p className="page-copy">
            Provider, model, request type, token, and cost estimates for {workspace.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings">Manage providers</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.25rem]">
          <CardHeader>
            <CardDescription>Requests</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(summary.requestCount)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Last {summary.windowDays} days
          </CardContent>
        </Card>
        <Card className="rounded-[1.25rem]">
          <CardHeader>
            <CardDescription>Estimated tokens</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(totalTokens)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatNumber(summary.tokenInputEstimate)} in /{" "}
            {formatNumber(summary.tokenOutputEstimate)} out
          </CardContent>
        </Card>
        <Card className="rounded-[1.25rem]">
          <CardHeader>
            <CardDescription>Estimated cost</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.costEstimate)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
            Provider estimate
          </CardContent>
        </Card>
        <Card className="rounded-[1.25rem]">
          <CardHeader>
            <CardDescription>Success rate</CardDescription>
            <CardTitle className="text-2xl">
              {summary.requestCount
                ? Math.round((summary.successCount / summary.requestCount) * 100)
                : 0}
              %
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {summary.failureCount} failed request(s)
          </CardContent>
        </Card>
      </div>

      <UsageTrendPanel
        daily={summary.daily}
        providerCount={summary.byProvider.length}
        requestCount={summary.requestCount}
        costEstimate={summary.costEstimate}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="grid gap-6">
          <Card className="rounded-[1.25rem]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>Usage by AI provider</CardTitle>
              </div>
              <CardDescription>Requests and estimated spend per provider.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summary.byProvider.length ? (
                summary.byProvider.map((provider) => (
                  <div
                    key={provider.key}
                    className="grid gap-2 rounded-xl border border-border/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium capitalize">{provider.key}</div>
                      <Badge className="bg-muted">
                        {formatNumber(provider.requestCount)} requests
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      <span>
                        {formatNumber(provider.tokenInputEstimate + provider.tokenOutputEstimate)}{" "}
                        tokens
                      </span>
                      <span>{formatCurrency(provider.costEstimate)}</span>
                      <span>{provider.failureCount} failed</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No provider usage yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>Usage by model</CardTitle>
              </div>
              <CardDescription>Model-level breakdown for routing and cost reviews.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summary.byModel.length ? (
                summary.byModel.map((model) => (
                  <div
                    key={model.key}
                    className="grid gap-2 rounded-xl border border-border/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{model.modelId}</div>
                        <div className="text-sm capitalize text-muted-foreground">
                          {model.provider}
                        </div>
                      </div>
                      <Badge className="bg-muted">{formatCurrency(model.costEstimate)}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(model.requestCount)} requests,{" "}
                      {formatNumber(model.tokenInputEstimate + model.tokenOutputEstimate)} tokens
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No model usage yet.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="grid content-start gap-6">
          <Card className="rounded-[1.25rem]">
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Upgrade plans or open the Stripe customer portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <BillingActions workspaceId={workspace.id} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem]">
            <CardHeader>
              <CardTitle>Usage by task</CardTitle>
              <CardDescription>Request types tracked for limits and billing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summary.byRequestType.length ? (
                summary.byRequestType.map((requestType) => (
                  <div
                    key={requestType.key}
                    className="flex items-center justify-between rounded-xl border border-border/70 p-3"
                  >
                    <span className="text-sm font-medium">
                      {requestType.requestType.replaceAll("_", " ")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatNumber(requestType.requestCount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No task usage yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem]">
            <CardHeader>
              <CardTitle>Recent requests</CardTitle>
              <CardDescription>Latest metered provider calls.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summary.recent.length ? (
                summary.recent.map((event) => (
                  <div key={event.id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{event.modelId}</span>
                      {event.success ? (
                        <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
                      ) : (
                        <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {event.provider} - {event.requestType.replaceAll("_", " ")} -{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No requests have been metered yet.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
