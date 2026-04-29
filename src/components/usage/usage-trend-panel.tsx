"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type DailyUsagePoint = {
  date: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  tokenInputEstimate: number;
  tokenOutputEstimate: number;
  costEstimate: number;
};

type MetricDefinition = {
  key: "requests" | "tokens" | "cost" | "failures";
  label: string;
  shortLabel: string;
  color: string;
  softColor: string;
  description: string;
  value: (point: DailyUsagePoint) => number;
  format: (value: number) => string;
};

type ActiveMeasurement = {
  metric: MetricDefinition;
  date: string;
  formattedDate: string;
  value: number;
  formattedValue: string;
  height: number;
};

const metrics: MetricDefinition[] = [
  {
    key: "requests",
    label: "Requests",
    shortLabel: "Req",
    color: "#ffd426",
    softColor: "rgba(255, 212, 38, 0.28)",
    description: "Total model calls recorded for the workspace on this day.",
    value: (point) => point.requestCount,
    format: formatNumber,
  },
  {
    key: "tokens",
    label: "Estimated tokens",
    shortLabel: "Tok",
    color: "#ff7a42",
    softColor: "rgba(255, 122, 66, 0.24)",
    description: "Estimated input plus output tokens captured from provider responses.",
    value: (point) => point.tokenInputEstimate + point.tokenOutputEstimate,
    format: formatNumber,
  },
  {
    key: "cost",
    label: "Estimated cost",
    shortLabel: "Cost",
    color: "#1ed87e",
    softColor: "rgba(30, 216, 126, 0.24)",
    description: "Approximate provider spend prepared for future billing enforcement.",
    value: (point) => point.costEstimate,
    format: formatCurrency,
  },
  {
    key: "failures",
    label: "Failed requests",
    shortLabel: "Fail",
    color: "#ff4658",
    softColor: "rgba(255, 70, 88, 0.22)",
    description: "Requests that failed and should be reviewed for provider or routing issues.",
    value: (point) => point.failureCount,
    format: formatNumber,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function buildMeasurement(
  metric: MetricDefinition,
  point: DailyUsagePoint,
  maxValue: number,
): ActiveMeasurement {
  const value = metric.value(point);
  const height = value === 0 ? 6 : Math.max(18, Math.round((value / Math.max(maxValue, 1)) * 100));

  return {
    metric,
    date: point.date,
    formattedDate: formatDateLabel(point.date),
    value,
    formattedValue: metric.format(value),
    height,
  };
}

export function UsageTrendPanel({
  daily,
  providerCount,
  requestCount,
  costEstimate,
}: {
  daily: DailyUsagePoint[];
  providerCount: number;
  requestCount: number;
  costEstimate: number;
}) {
  const days = useMemo(() => daily.slice(-8), [daily]);
  const maxByMetric = useMemo(
    () =>
      new Map(
        metrics.map((metric) => [
          metric.key,
          Math.max(...days.map((point) => metric.value(point)), 1),
        ]),
      ),
    [days],
  );

  const firstMeasurement = days[days.length - 1]
    ? buildMeasurement(metrics[0], days[days.length - 1], maxByMetric.get(metrics[0].key) ?? 1)
    : null;
  const [active, setActive] = useState<ActiveMeasurement | null>(firstMeasurement);
  const columnTemplate = {
    gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(64px, 1fr))`,
  };

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
            Each lane is scaled independently so requests, tokens, cost, and failures remain
            readable even when values differ by orders of magnitude.
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

      <div className="p-5 lg:p-6">
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
            {metrics.map((metric) => (
              <span
                key={metric.key}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: metric.color }}
                  aria-hidden="true"
                />
                {metric.label}
              </span>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
              Hover metric
            </p>
            {active ? (
              <div className="mt-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{active.metric.label}</h3>
                  <span className="font-mono text-sm font-semibold">{active.formattedValue}</span>
                </div>
                <p className="mt-1 text-xs text-white/50">{active.formattedDate}</p>
                <p className="mt-2 text-xs leading-5 text-white/60">{active.metric.description}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-white/60">
                Hover or focus a bar to inspect what is being measured.
              </p>
            )}
          </div>
        </div>

        {days.length ? (
          <div className="thin-scrollbar overflow-x-auto pb-1">
            <div className="w-full min-w-[760px] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(16,24,25,0.38)]">
              {metrics.map((metric) => {
                const maxValue = maxByMetric.get(metric.key) ?? 1;

                return (
                  <div
                    key={metric.key}
                    className="grid min-h-[92px] grid-cols-[132px_minmax(0,1fr)] border-b border-white/10 last:border-b-0"
                  >
                    <div className="flex flex-col justify-center border-r border-white/10 px-4">
                      <span className="text-sm font-semibold">{metric.label}</span>
                      <span className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-white/40">
                        {metric.shortLabel}
                      </span>
                    </div>
                    <div className="grid gap-2 px-4 py-4" style={columnTemplate}>
                      {days.map((point) => {
                        const measurement = buildMeasurement(metric, point, maxValue);
                        const isActive =
                          active?.metric.key === metric.key && active.date === point.date;

                        return (
                          <button
                            key={`${metric.key}-${point.date}`}
                            type="button"
                            className="group relative flex h-16 min-w-0 items-end rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
                            aria-label={`${metric.label}: ${measurement.formattedValue} on ${measurement.formattedDate}. ${metric.description}`}
                            title={`${metric.label}: ${measurement.formattedValue} on ${measurement.formattedDate}. ${metric.description}`}
                            onFocus={() => setActive(measurement)}
                            onMouseEnter={() => setActive(measurement)}
                          >
                            <span className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
                            <span
                              className={cn(
                                "relative block w-full rounded-t-xl border border-white/10 shadow-[0_18px_34px_rgba(0,0,0,0.22)] transition duration-200 ease-out group-hover:-translate-y-1 group-hover:brightness-110 group-focus-visible:-translate-y-1",
                                isActive ? "-translate-y-1 brightness-110" : "",
                              )}
                              style={{
                                height: `${measurement.height}%`,
                                background: `linear-gradient(180deg, ${metric.color}, ${metric.softColor})`,
                                opacity: measurement.value === 0 ? 0.42 : 1,
                              }}
                            >
                              <span
                                className={cn(
                                  "absolute inset-x-1 top-1 h-2 rounded-full bg-white/20 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100",
                                  isActive ? "opacity-100" : "",
                                )}
                                aria-hidden="true"
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-[132px_minmax(0,1fr)] bg-white/[0.03]">
                <div className="border-r border-white/10 px-4 py-3 text-xs text-white/40">
                  Day
                </div>
                <div className="grid gap-2 px-4 py-3" style={columnTemplate}>
                  {days.map((point) => (
                    <span
                      key={point.date}
                      className="truncate text-center text-[0.68rem] font-medium text-white/40"
                    >
                      {formatDateLabel(point.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <div>
              <p className="text-sm font-semibold">No metered usage yet</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                Send a chat request through a connected provider and this chart will show requests,
                tokens, cost, and failures across the billing window.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
