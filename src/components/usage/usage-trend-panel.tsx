"use client";

import { useMemo, useState } from "react";

type DailyUsagePoint = {
  date: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  tokenInputEstimate: number;
  tokenOutputEstimate: number;
  costEstimate: number;
};

type ChartPoint = DailyUsagePoint & {
  x: number;
  y: number;
  label: string;
  totalTokens: number;
};

const chart = {
  width: 1000,
  height: 270,
  left: 52,
  right: 52,
  top: 34,
  baseline: 214,
};

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

function buildChartPoints(daily: DailyUsagePoint[]) {
  const days = daily.slice(-8);
  const maxRequests = Math.max(...days.map((day) => day.requestCount), 1);
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.baseline - chart.top;

  return days.map((day, index) => {
    const x =
      days.length === 1
        ? chart.left + plotWidth / 2
        : chart.left + (index / (days.length - 1)) * plotWidth;
    const y = chart.baseline - (day.requestCount / maxRequests) * (plotHeight * 0.82);

    return {
      ...day,
      x,
      y,
      label: formatDateLabel(day.date),
      totalTokens: day.tokenInputEstimate + day.tokenOutputEstimate,
    };
  });
}

function buildPath(points: ChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function Tooltip({ point }: { point: ChartPoint }) {
  const tooltipWidth = 248;
  const tooltipHeight = 94;
  const x = Math.min(Math.max(point.x - tooltipWidth / 2, 18), chart.width - tooltipWidth - 18);
  const y = point.y > chart.top + tooltipHeight + 18 ? point.y - tooltipHeight - 18 : point.y + 22;

  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect
        width={tooltipWidth}
        height={tooltipHeight}
        rx="16"
        fill="#2f3839"
        stroke="rgba(255,255,255,0.18)"
      />
      <text x="16" y="25" fill="#f2f7f4" fontSize="15" fontWeight="700">
        {point.label}
      </text>
      <text x="16" y="49" fill="rgba(255,255,255,0.72)" fontSize="13">
        {formatNumber(point.requestCount)} requests, {formatNumber(point.successCount)} successful
      </text>
      <text x="16" y="70" fill="rgba(255,255,255,0.72)" fontSize="13">
        {formatNumber(point.totalTokens)} tokens, {formatCurrency(point.costEstimate)}
      </text>
      <text x="16" y="88" fill="rgba(255,255,255,0.62)" fontSize="12">
        {formatNumber(point.failureCount)} failed request(s)
      </text>
    </g>
  );
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
  const points = useMemo(() => buildChartPoints(daily), [daily]);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, points.length - 1));
  const activePoint = points[activeIndex] ?? null;
  const path = buildPath(points);
  const bandWidth =
    points.length > 1
      ? (chart.width - chart.left - chart.right) / (points.length - 1)
      : chart.width - chart.left - chart.right;

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

      <div className="p-5 lg:p-6">
        {points.length ? (
          <>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="h-[280px] w-full"
              role="img"
              aria-label="Usage trend over the current billing window. Hover or focus a point to inspect requests, tokens, cost, and failures."
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

              {[chart.baseline, 166, 118, 70].map((y, index) => (
                <path
                  key={y}
                  d={`M${chart.left} ${y} H${chart.width - chart.right}`}
                  stroke={index === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)"}
                  strokeDasharray={index === 0 ? undefined : "4 7"}
                  strokeWidth="1"
                />
              ))}

              {points.map((point, index) => {
                const isActive = activeIndex === index;
                const x = Math.max(chart.left, point.x - bandWidth / 2);
                const width = Math.min(
                  bandWidth,
                  chart.width - chart.right - x + (index === points.length - 1 ? bandWidth / 2 : 0),
                );

                return (
                  <rect
                    key={`hit-${point.date}`}
                    x={x}
                    y={chart.top}
                    width={width}
                    height={chart.baseline - chart.top}
                    rx="14"
                    fill={isActive ? "rgba(255,255,255,0.07)" : "transparent"}
                    stroke={isActive ? "rgba(255,255,255,0.10)" : "transparent"}
                    tabIndex={0}
                    role="button"
                    aria-label={`${point.label}: ${formatNumber(point.requestCount)} requests, ${formatNumber(point.totalTokens)} tokens, ${formatCurrency(point.costEstimate)}, ${formatNumber(point.failureCount)} failed requests.`}
                    onFocus={() => setActiveIndex(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                );
              })}

              <path
                d={`${path} L ${points.at(-1)?.x ?? chart.width - chart.right} ${chart.baseline} L ${points[0]?.x ?? chart.left} ${chart.baseline} Z`}
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

              {points.map((point, index) => {
                const isActive = activeIndex === index;

                return (
                  <g key={point.date}>
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={chart.top}
                      y2={chart.baseline}
                      stroke="rgba(255,255,255,0.18)"
                      strokeDasharray="4 7"
                      opacity={isActive ? 1 : 0}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? "10" : "7"}
                      fill={index === points.length - 1 ? "#09d970" : "#ffd426"}
                      stroke="#20282a"
                      strokeWidth="4"
                    />
                    <text
                      x={point.x}
                      y={chart.height - 18}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.45)"
                      fontSize="12"
                      fontWeight={isActive ? "700" : "500"}
                    >
                      {point.label}
                    </text>
                  </g>
                );
              })}

              {activePoint ? <Tooltip point={activePoint} /> : null}
            </svg>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
              {[
                ["Requests", "Model calls stored in usage logs.", "#ffd426"],
                ["Tokens", "Input plus output token estimates.", "#ff6f42"],
                ["Cost", "Provider cost estimate for billing.", "#09d970"],
                ["Failures", "Provider or routing calls that failed.", "#ff4658"],
              ].map(([label, description, color]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                  title={`${label}: ${description}`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <div>
              <p className="text-sm font-semibold">No metered usage yet</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                Send a chat request through a connected provider and this panel will show requests,
                tokens, cost, and failures across the billing window.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
