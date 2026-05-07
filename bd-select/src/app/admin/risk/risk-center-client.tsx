"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  readApi,
  writeApi,
  type Persona,
  type RiskCaseSummary,
  type RiskCategory,
  type RiskCenterSummary,
  type RiskSeverity,
} from "@/lib/client/api";

const categoryFilters: ("all" | RiskCategory)[] = [
  "all",
  "identity",
  "listing",
  "messaging",
  "logistics",
  "dispute",
  "barter",
  "payment",
];
const severityFilters: ("all" | RiskSeverity)[] = ["all", "critical", "high", "medium", "low"];

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

function severityTone(severity: RiskSeverity) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-border bg-background text-muted-foreground";
}

function actionCopy(item: RiskCaseSummary) {
  if (item.entity === "Listing") return "Move to review";
  if (item.entity === "MessageThread") return "Lock thread";
  if (item.entity === "Dispute") return "Request evidence";
  if (item.entity === "Shipment") return "Escalate shipment";
  if (item.entity === "User") return "Notify account";
  return "Escalate";
}

export function RiskCenterClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [riskCenter, setRiskCenter] = useState<RiskCenterSummary>({
    cases: [],
    stats: { total: 0, critical: 0, high: 0, medium: 0, open: 0 },
    facets: { categories: [], severities: [] },
  });
  const [categoryFilter, setCategoryFilter] = useState<"all" | RiskCategory>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | RiskSeverity>("all");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [note, setNote] = useState("Reviewed from BD Select risk center.");
  const [message, setMessage] = useState("Loading risk center.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const selectedCase = useMemo(() => {
    return (
      riskCenter.cases.find((item) => item.id === selectedCaseId) ?? riskCenter.cases[0] ?? null
    );
  }, [riskCenter.cases, selectedCaseId]);

  const loadRisk = useCallback(
    async (userId: string, preferredCaseId?: string) => {
      if (!userId) return;

      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);

      const result = await readApi<RiskCenterSummary>(
        `/api/v1/admin/risk${params.toString() ? `?${params.toString()}` : ""}`,
        userId,
      );
      setRiskCenter(result);
      setSelectedCaseId((current) => {
        if (preferredCaseId && result.cases.some((item) => item.id === preferredCaseId)) {
          return preferredCaseId;
        }
        if (result.cases.some((item) => item.id === current)) return current;
        return result.cases[0]?.id ?? "";
      });
      setMessage(
        result.cases.length ? "Risk center loaded." : "No risk cases match the current filters.",
      );
    },
    [categoryFilter, severityFilter],
  );

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Risk personas failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadRisk(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Risk data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadRisk]);

  async function applyAction(action: "acknowledge" | "escalate") {
    if (!activeUserId || !selectedCase) {
      setMessage("Select a risk case first.");
      return;
    }

    setBusyAction(action);
    try {
      await writeApi("/api/v1/admin/risk/actions", activeUserId, {
        caseId: selectedCase.id,
        action,
        note,
      });
      setMessage(action === "acknowledge" ? "Risk case acknowledged." : "Risk escalation applied.");
      await loadRisk(activeUserId, selectedCase.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Risk action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-muted-foreground">
            Back to trust desk
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Risk operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Risk center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Computed fraud, abuse, logistics, dispute, and listing signals with auditable escalation
            actions for support operators.
          </p>
        </div>
        <PersonaSelector
          label="Risk persona"
          personas={personas}
          activeUserId={activeUserId}
          onChange={setActiveUserId}
        />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? (
          <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span>
        ) : null}
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-5">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Cases</p>
          <p className="mt-2 text-3xl font-semibold">{riskCenter.stats.total}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Critical</p>
          <p className="mt-2 text-3xl font-semibold">{riskCenter.stats.critical}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">High</p>
          <p className="mt-2 text-3xl font-semibold">{riskCenter.stats.high}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Medium</p>
          <p className="mt-2 text-3xl font-semibold">{riskCenter.stats.medium}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Open</p>
          <p className="mt-2 text-3xl font-semibold">{riskCenter.stats.open}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[20rem_1fr]">
        <aside className="grid h-fit gap-4">
          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="text-xl font-semibold">Filters</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Category
                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value as "all" | RiskCategory)
                  }
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  {categoryFilters.map((item) => (
                    <option key={item} value={item}>
                      {labelize(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Severity
                <select
                  value={severityFilter}
                  onChange={(event) =>
                    setSeverityFilter(event.target.value as "all" | RiskSeverity)
                  }
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  {severityFilters.map((item) => (
                    <option key={item} value={item}>
                      {labelize(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="text-xl font-semibold">Action note</h2>
            <textarea
              value={note}
              rows={4}
              onChange={(event) => setNote(event.target.value)}
              className="mt-4 w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled={!selectedCase || busyAction === "acknowledge"}
                onClick={() => void applyAction("acknowledge")}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busyAction === "acknowledge" ? "Saving..." : "Acknowledge"}
              </button>
              <button
                type="button"
                disabled={!selectedCase || busyAction === "escalate"}
                onClick={() => void applyAction("escalate")}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busyAction === "escalate"
                  ? "Escalating..."
                  : selectedCase
                    ? actionCopy(selectedCase)
                    : "Escalate"}
              </button>
            </div>
          </section>
        </aside>

        <section className="grid gap-5 lg:grid-cols-[0.42fr_1fr]">
          <section className="rounded-md border border-border bg-white">
            <div className="border-b border-border p-4">
              <h2 className="text-xl font-semibold">Queue</h2>
            </div>
            <div className="max-h-[58rem] overflow-y-auto">
              {riskCenter.cases.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No risk cases.</div>
              ) : null}
              {riskCenter.cases.map((item) => {
                const selected = item.id === selectedCase?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCaseId(item.id)}
                    className={`grid w-full gap-2 border-b border-border p-4 text-left ${
                      selected ? "bg-background" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {labelize(item.category)} / {item.entity}
                      </p>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${severityTone(item.severity)}`}
                      >
                        {item.score}
                      </span>
                    </div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-h-[58rem] rounded-md border border-border bg-white">
            {selectedCase ? (
              <div>
                <header className="border-b border-border p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {labelize(selectedCase.category)} / {selectedCase.entity} /{" "}
                    {labelize(selectedCase.severity)}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold">{selectedCase.title}</h2>
                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                    <p>Score: {selectedCase.score}/100</p>
                    <p>Status: {labelize(selectedCase.status)}</p>
                    <p>Updated: {formatDate(selectedCase.updatedAt)}</p>
                    <p>Actor: {selectedCase.actor?.email ?? selectedCase.actor?.name ?? "n/a"}</p>
                    <p>Entity id: {selectedCase.entityId}</p>
                    <p>
                      <Link href={selectedCase.href} className="font-semibold text-foreground">
                        Open workflow
                      </Link>
                    </p>
                  </div>
                </header>

                <div className="grid gap-3 p-5">
                  {selectedCase.signals.map((riskSignal) => (
                    <article
                      key={`${riskSignal.label}-${riskSignal.detail}`}
                      className="rounded-md border border-border bg-background p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold">{riskSignal.label}</h3>
                        <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold">
                          +{riskSignal.weight}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {riskSignal.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[58rem] place-items-center p-8 text-center">
                <div>
                  <h2 className="text-3xl font-semibold">No case selected</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    Risk cases are computed from marketplace workflow data and appear here for admin
                    review.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
