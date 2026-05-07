"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  formatNgn,
  readApi,
  type DailyMetricSummary,
  type InsightsSummary,
  type Persona,
  type ReportingRange,
} from "@/lib/client/api";

const reportingRanges: ReportingRange[] = ["7d", "30d", "90d", "all"];

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value);
}

function metricTone(value: number, cautionAt = 1) {
  return value >= cautionAt ? "text-foreground" : "text-muted-foreground";
}

function maxSeriesValue(series: DailyMetricSummary[], field: "count" | "totalNgn") {
  return Math.max(...series.map((item) => item[field]), 1);
}

function maxMoneyValue(items: { totalNgn: number }[]) {
  return Math.max(...items.map((item) => item.totalNgn), 1);
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border bg-background p-8 text-center">
      <h2 className="text-2xl font-semibold">No reporting data</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Marketplace activity will populate this section as orders, listings, and operations move.
      </p>
    </div>
  );
}

function EmptyCopy() {
  return <p className="text-sm text-muted-foreground">No data for the selected range.</p>;
}

function MiniBars({
  title,
  series,
  field,
  money = false,
}: {
  title: string;
  series: DailyMetricSummary[];
  field: "count" | "totalNgn";
  money?: boolean;
}) {
  const maxValue = maxSeriesValue(series, field);

  return (
    <section className="rounded-md border border-border bg-white p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {series.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No series data.</p>
      ) : (
        <div className="mt-4 flex h-44 items-end gap-2">
          {series.map((point) => {
            const value = point[field];
            return (
              <div key={point.date} className="grid h-full min-w-7 flex-1 content-end gap-2">
                <div
                  className="rounded-t-md bg-primary"
                  style={{ height: `${Math.max(6, (value / maxValue) * 100)}%` }}
                  title={`${point.date}: ${money ? formatNgn(value) : formatNumber(value)}`}
                />
                <p className="truncate text-center text-[10px] text-muted-foreground">
                  {point.date.slice(5)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function InsightsClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [range, setRange] = useState<ReportingRange>("30d");
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [message, setMessage] = useState("Loading marketplace insights.");

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const loadInsights = useCallback(
    async (userId: string) => {
      if (!userId) return;

      const result = await readApi<InsightsSummary>(
        `/api/v1/admin/insights?range=${range}`,
        userId,
      );
      setInsights(result);
      setMessage(`Insights loaded for ${result.range}.`);
    },
    [range],
  );

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Insight personas failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadInsights(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Insights failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadInsights]);

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-muted-foreground">
            Back to trust desk
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Marketplace reporting
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Insights</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Operating metrics for GMV, escrow, supply, trust, logistics, barter, seller growth, and
            payout health.
          </p>
        </div>
        <div className="grid gap-3">
          <PersonaSelector
            label="Insights persona"
            personas={personas}
            activeUserId={activeUserId}
            onChange={setActiveUserId}
          />
          <label className="grid gap-2 text-sm font-medium">
            Range
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as ReportingRange)}
              className="min-w-72 rounded-md border border-border bg-white px-3 py-2"
            >
              {reportingRanges.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All time" : item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? (
          <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span>
        ) : null}
        {insights ? (
          <span className="ml-4 text-muted-foreground">
            Generated: {formatDate(insights.generatedAt)}
          </span>
        ) : null}
      </section>

      {insights ? (
        <>
          <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-4">
            <article className="rounded-md border border-border bg-white p-4">
              <p className="text-sm text-muted-foreground">GMV</p>
              <p className="mt-2 text-3xl font-semibold">{formatNgn(insights.revenue.gmvNgn)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {insights.revenue.revenueOrderCount} revenue orders
              </p>
            </article>
            <article className="rounded-md border border-border bg-white p-4">
              <p className="text-sm text-muted-foreground">Escrow held</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatNgn(insights.revenue.escrowHeldNgn)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Take rate {insights.revenue.takeRatePercent}%
              </p>
            </article>
            <article className="rounded-md border border-border bg-white p-4">
              <p className="text-sm text-muted-foreground">Live supply</p>
              <p className="mt-2 text-3xl font-semibold">{insights.supply.liveListings}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatNgn(insights.supply.totalLiveValueNgn)} listed value
              </p>
            </article>
            <article className="rounded-md border border-border bg-white p-4">
              <p className="text-sm text-muted-foreground">Trust load</p>
              <p
                className={`mt-2 text-3xl font-semibold ${metricTone(
                  insights.trust.activeDisputes,
                )}`}
              >
                {insights.trust.activeDisputes}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {insights.trust.redactedMessages} redacted messages
              </p>
            </article>
          </section>

          <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[1fr_0.55fr]">
            <div className="grid gap-5">
              <section className="grid gap-3 md:grid-cols-3">
                <MiniBars
                  title="Daily GMV"
                  series={insights.series.dailyGmv}
                  field="totalNgn"
                  money
                />
                <MiniBars title="Daily orders" series={insights.series.dailyOrders} field="count" />
                <MiniBars
                  title="Daily listings"
                  series={insights.series.dailyListings}
                  field="count"
                />
              </section>

              <section className="grid gap-3 lg:grid-cols-3">
                <article className="rounded-md border border-border bg-white p-4">
                  <h2 className="text-xl font-semibold">Operations</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Review queue</dt>
                      <dd className="font-semibold">{insights.trust.openReviewQueue}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Restricted review</dt>
                      <dd className="font-semibold">{insights.trust.restrictedReviewQueue}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Audit signed</dt>
                      <dd className="font-semibold">
                        {insights.trust.auditSignatureCoveragePercent}%
                      </dd>
                    </div>
                  </dl>
                </article>

                <article className="rounded-md border border-border bg-white p-4">
                  <h2 className="text-xl font-semibold">Logistics</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Active</dt>
                      <dd className="font-semibold">{insights.logistics.activeShipments}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Delivered</dt>
                      <dd className="font-semibold">{insights.logistics.deliveredShipments}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Exceptions</dt>
                      <dd className="font-semibold">{insights.logistics.exceptionShipments}</dd>
                    </div>
                  </dl>
                </article>

                <article className="rounded-md border border-border bg-white p-4">
                  <h2 className="text-xl font-semibold">Growth</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Pro active</dt>
                      <dd className="font-semibold">{insights.growth.activeProSubscriptions}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Pro revenue</dt>
                      <dd className="font-semibold">
                        {formatNgn(insights.growth.proSubscriptionRevenueNgn)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Promotions</dt>
                      <dd className="font-semibold">
                        {formatNgn(insights.growth.promotionRevenueNgn)}
                      </dd>
                    </div>
                  </dl>
                </article>
              </section>

              <section className="grid gap-3 lg:grid-cols-3">
                <article className="rounded-md border border-border bg-white p-4">
                  <h2 className="text-xl font-semibold">Users</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">New users</dt>
                      <dd className="font-semibold">{insights.users.newUsers}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Buyers</dt>
                      <dd className="font-semibold">{insights.users.buyers}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Verified</dt>
                      <dd className="font-semibold">{insights.users.verified}</dd>
                    </div>
                  </dl>
                </article>

                <article className="rounded-md border border-border bg-white p-4">
                  <h2 className="text-xl font-semibold">Listing status</h2>
                  <div className="mt-4 grid gap-2 text-sm">
                    {insights.breakdowns.listingStatuses.length === 0 ? <EmptyCopy /> : null}
                    {insights.breakdowns.listingStatuses.slice(0, 6).map((status) => (
                      <div key={status.label} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{labelize(status.label)}</span>
                        <span className="font-semibold">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-md border border-border bg-white p-4">
                  <h2 className="text-xl font-semibold">Order status</h2>
                  <div className="mt-4 grid gap-2 text-sm">
                    {insights.breakdowns.orderStatuses.length === 0 ? <EmptyCopy /> : null}
                    {insights.breakdowns.orderStatuses.slice(0, 6).map((status) => (
                      <div key={status.label} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{labelize(status.label)}</span>
                        <span className="font-semibold">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>

            <aside className="grid gap-5">
              <section className="rounded-md border border-border bg-white p-4">
                <h2 className="text-xl font-semibold">Top sellers</h2>
                <div className="mt-4 grid gap-3">
                  {insights.breakdowns.topSellers.length === 0 ? <EmptyCopy /> : null}
                  {insights.breakdowns.topSellers.map((seller) => (
                    <article
                      key={seller.sellerId}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">
                          {seller.email ?? seller.name ?? seller.sellerId}
                        </p>
                        <p className="text-sm font-semibold">{formatNgn(seller.gmvNgn)}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {seller.orders} orders / score {seller.sellerScore.toFixed(1)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-border bg-white p-4">
                <h2 className="text-xl font-semibold">Brand revenue</h2>
                <div className="mt-4 grid gap-3">
                  {insights.breakdowns.brandRevenue.length === 0 ? <EmptyCopy /> : null}
                  {insights.breakdowns.brandRevenue.map((brand) => (
                    <div key={brand.label} className="grid gap-2">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold">{brand.label}</span>
                        <span>{formatNgn(brand.totalNgn)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-background">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${Math.max(
                              6,
                              (brand.totalNgn / maxMoneyValue(insights.breakdowns.brandRevenue)) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-border bg-white p-4">
                <h2 className="text-xl font-semibold">Category revenue</h2>
                <div className="mt-4 grid gap-3">
                  {insights.breakdowns.categoryRevenue.length === 0 ? <EmptyCopy /> : null}
                  {insights.breakdowns.categoryRevenue.map((category) => (
                    <div key={category.label} className="grid gap-2">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold">{category.label}</span>
                        <span>{formatNgn(category.totalNgn)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-background">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${Math.max(
                              6,
                              (category.totalNgn /
                                maxMoneyValue(insights.breakdowns.categoryRevenue)) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-border bg-white p-4">
                <h2 className="text-xl font-semibold">Barter and payouts</h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Barter proposals</dt>
                    <dd className="font-semibold">{insights.barter.proposals}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Top-up exposure</dt>
                    <dd className="font-semibold">{formatNgn(insights.barter.topUpExposureNgn)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Payout queued</dt>
                    <dd className="font-semibold">{formatNgn(insights.payouts.queuedNgn)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Payout paid</dt>
                    <dd className="font-semibold">{formatNgn(insights.payouts.paidNgn)}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </section>
        </>
      ) : (
        <section className="mx-auto mt-5 max-w-7xl">
          <EmptyState />
        </section>
      )}
    </main>
  );
}
