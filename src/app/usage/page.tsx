import Link from "next/link";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "@/components/ui/huge-icons";
import { AppShell } from "@/components/layout/app-shell";
import { BillingActions } from "@/components/billing/billing-actions";
import { ProviderLogo } from "@/components/integrations/provider-logo";
import { UsageTrendPanel } from "@/components/usage/usage-trend-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth/session";
import {
  parseUsageRequestType,
  parseUsageStatus,
  UsageService,
  usageRequestTypes,
} from "@/modules/usage/usage-service";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

type UsagePageProps = {
  searchParams?:
    | Promise<{
        days?: string;
        provider?: string;
        model?: string;
        requestType?: string;
        status?: string;
      }>
    | {
        days?: string;
        provider?: string;
        model?: string;
        requestType?: string;
        status?: string;
      };
};

type UsageQuery = {
  days: number;
  provider?: string;
  model?: string;
  requestType?: string;
  status?: string;
};

const rangeOptions = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
];

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

function parseDays(value?: string) {
  const rawDays = Number(value ?? "30");
  return Number.isFinite(rawDays) ? Math.min(Math.max(Math.trunc(rawDays), 1), 365) : 30;
}

function cleanFilter(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "all" ? trimmed.slice(0, 140) : undefined;
}

function formatRequestType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function usageHref(current: UsageQuery, updates: Partial<UsageQuery>) {
  const next = { ...current, ...updates };
  const params = new URLSearchParams();

  params.set("days", String(next.days));

  if (next.provider) {
    params.set("provider", next.provider);
  }

  if (next.model) {
    params.set("model", next.model);
  }

  if (next.requestType) {
    params.set("requestType", next.requestType);
  }

  if (next.status) {
    params.set("status", next.status);
  }

  return `/usage?${params.toString()}`;
}

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const user = await requireUser();
  const workspaces = await new WorkspaceService().listForUser(user.id);
  const workspace = workspaces[0];
  const params = await searchParams;
  const days = parseDays(params?.days);
  const provider = cleanFilter(params?.provider);
  const model = cleanFilter(params?.model);
  const requestType = parseUsageRequestType(params?.requestType);
  const status = parseUsageStatus(params?.status);
  const currentQuery: UsageQuery = {
    days,
    provider,
    model,
    requestType,
    status,
  };
  const hasNarrowFilters = Boolean(provider || model || requestType || status);
  const activeFilterCount =
    Number(days !== 30) +
    Number(Boolean(provider)) +
    Number(Boolean(model)) +
    Number(Boolean(requestType)) +
    Number(Boolean(status));

  if (!workspace) {
    return (
      <AppShell>
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          Create a workspace before usage can be tracked.
        </div>
      </AppShell>
    );
  }

  const usageService = new UsageService();
  const baseSummary = await usageService.summarize(workspace.id, { days });
  const summary = hasNarrowFilters
    ? await usageService.summarize(workspace.id, {
        days,
        provider,
        modelId: model,
        requestType,
        status,
      })
    : baseSummary;
  const totalTokens = summary.tokenInputEstimate + summary.tokenOutputEstimate;

  return (
    <AppShell>
      <div className="page-shell mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#6d7784]"
          >
            <Link
              href="/dashboard"
              className="font-medium text-[#52606d] transition hover:text-[#111418]"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-[#111418]">Usage & Cost</span>
          </nav>
          <p className="page-kicker">Metering</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="page-title">Usage</h1>
            {activeFilterCount ? (
              <Badge className="bg-[#e8f2ff] text-[#245b93]">
                {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <p className="page-copy">
            Provider, model, request type, token, and cost estimates for {workspace.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings">Manage providers</Link>
        </Button>
      </div>

      <section className="page-shell mb-5 rounded-[1.25rem] border border-[#d8e5ed] bg-white p-4 shadow-[0_18px_40px_-30px_rgba(25,45,68,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
              Usage filters
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Scope the dashboard by billing window, provider, model, request type, and outcome.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Range
            </span>
            <div className="flex flex-wrap gap-1 rounded-xl border border-[#d9e3eb] bg-[#f7fafd] p-1">
              {rangeOptions.map((option) => (
                <Link
                  key={option.value}
                  href={usageHref(currentQuery, { days: option.value })}
                  className={
                    days === option.value
                      ? "rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#111418] shadow-sm"
                      : "rounded-lg px-3 py-1.5 text-xs font-semibold text-[#53606d] transition hover:bg-white hover:text-[#111418]"
                  }
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <form
          method="get"
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[120px_repeat(4,minmax(0,1fr))_auto] xl:items-end"
        >
          <div>
            <Label htmlFor="usage-days" className="text-xs text-muted-foreground">
              Days
            </Label>
            <Select
              id="usage-days"
              name="days"
              defaultValue={String(days)}
              className="mt-1 w-full rounded-xl"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === 365 ? "Last year" : `Last ${option.label}`}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="usage-provider" className="text-xs text-muted-foreground">
              Provider
            </Label>
            <Select
              id="usage-provider"
              name="provider"
              defaultValue={provider ?? "all"}
              className="mt-1 w-full rounded-xl"
            >
              <option value="all">All providers</option>
              {baseSummary.byProvider.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.key}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="usage-model" className="text-xs text-muted-foreground">
              Model
            </Label>
            <Select
              id="usage-model"
              name="model"
              defaultValue={model ?? "all"}
              className="mt-1 w-full rounded-xl"
            >
              <option value="all">All models</option>
              {baseSummary.byModel.map((item) => (
                <option key={item.key} value={item.modelId}>
                  {item.modelId}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="usage-request-type" className="text-xs text-muted-foreground">
              Request type
            </Label>
            <Select
              id="usage-request-type"
              name="requestType"
              defaultValue={requestType ?? "all"}
              className="mt-1 w-full rounded-xl"
            >
              <option value="all">All request types</option>
              {usageRequestTypes.map((item) => (
                <option key={item} value={item}>
                  {formatRequestType(item)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="usage-status" className="text-xs text-muted-foreground">
              Status
            </Label>
            <Select
              id="usage-status"
              name="status"
              defaultValue={status ?? "all"}
              className="mt-1 w-full rounded-xl"
            >
              <option value="all">All outcomes</option>
              <option value="success">Successful only</option>
              <option value="failed">Failed only</option>
            </Select>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <Button type="submit" className="flex-1 rounded-xl xl:flex-none">
              Apply
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/usage" aria-label="Clear usage filters">
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </Link>
            </Button>
          </div>
        </form>
      </section>

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
                <div className="flex -space-x-2">
                  {(summary.byProvider.length
                    ? summary.byProvider.slice(0, 3).map((provider) => provider.key)
                    : ["openai", "anthropic", "google"]
                  ).map((provider) => (
                    <ProviderLogo
                      key={provider}
                      provider={provider}
                      className="h-8 w-8 rounded-lg ring-2 ring-white"
                    />
                  ))}
                </div>
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
                      <div className="group/provider flex min-w-0 items-center gap-3">
                        <ProviderLogo provider={provider.key} className="h-8 w-8 rounded-lg" />
                        <div className="truncate font-medium capitalize">{provider.key}</div>
                      </div>
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
