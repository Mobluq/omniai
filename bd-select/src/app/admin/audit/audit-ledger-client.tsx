"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import { readApi, writeApi, type AuditLedgerSummary, type AuditLogSummary, type Persona } from "@/lib/client/api";

const signedFilters = ["all", "signed", "unsigned"] as const;
type SignedFilter = (typeof signedFilters)[number];

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

function shortId(value: string | null) {
  if (!value) return "none";
  if (value.length <= 12) return value;
  return `${value.slice(0, 7)}...${value.slice(-4)}`;
}

function jsonSummary(value: AuditLogSummary["beforeState"]) {
  if (!value) return "none";
  return JSON.stringify(value, null, 2);
}

export function AuditLedgerClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [ledger, setLedger] = useState<AuditLedgerSummary | null>(null);
  const [signedFilter, setSignedFilter] = useState<SignedFilter>("all");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [take, setTake] = useState(100);
  const [message, setMessage] = useState("Loading audit ledger.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const integrityPercent = useMemo(() => {
    if (!ledger || ledger.stats.total === 0) return 0;
    return Math.round((ledger.stats.signed / ledger.stats.total) * 100);
  }, [ledger]);

  const loadLedger = useCallback(
    async (userId: string) => {
      if (!userId) return;

      const params = new URLSearchParams({
        signed: signedFilter,
        take: String(take),
      });
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);

      const result = await readApi<AuditLedgerSummary>(`/api/v1/admin/audit?${params.toString()}`, userId);
      setLedger(result);
      setMessage(result.logs.length ? "Audit ledger loaded." : "No audit events match the current filters.");
    },
    [actionFilter, entityFilter, signedFilter, take],
  );

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Audit ledger failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadLedger(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Audit ledger data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadLedger]);

  async function signBatch() {
    if (!activeUserId) {
      setMessage("Select an admin persona first.");
      return;
    }

    setBusyAction("sign");
    try {
      const result = await writeApi<{ signedCount: number; signatureVersion: string }>(
        "/api/v1/admin/audit/sign-batch",
        activeUserId,
        { limit: 100 },
      );
      setMessage(`Signed ${result.signedCount} audit events with ${result.signatureVersion}.`);
      await loadLedger(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Audit signing failed.");
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
            Compliance ledger
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Audit center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Inspect regulated marketplace actions, operator decisions, state transitions, and
            signature coverage from one admin-only ledger.
          </p>
        </div>
        <PersonaSelector
          label="Audit persona"
          personas={personas}
          activeUserId={activeUserId}
          onChange={setActiveUserId}
        />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span> : null}
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-4">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Total events</p>
          <p className="mt-2 text-3xl font-semibold">{ledger?.stats.total ?? 0}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Signed</p>
          <p className="mt-2 text-3xl font-semibold">{ledger?.stats.signed ?? 0}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Unsigned</p>
          <p className="mt-2 text-3xl font-semibold">{ledger?.stats.unsigned ?? 0}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Integrity</p>
          <p className="mt-2 text-3xl font-semibold">{integrityPercent}%</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 lg:grid-cols-[19rem_1fr]">
        <aside className="h-fit rounded-md border border-border bg-white p-4">
          <h2 className="text-xl font-semibold">Controls</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-medium">
              Signature
              <select
                value={signedFilter}
                onChange={(event) => setSignedFilter(event.target.value as SignedFilter)}
                className="rounded-md border border-border bg-white px-3 py-2"
              >
                {signedFilters.map((filter) => (
                  <option key={filter} value={filter}>
                    {labelize(filter)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Entity
              <select
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value)}
                className="rounded-md border border-border bg-white px-3 py-2"
              >
                <option value="">All entities</option>
                {ledger?.facets.entities.map((facet) => (
                  <option key={facet.entity} value={facet.entity}>
                    {facet.entity} / {facet.count}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Action search
              <input
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="rounded-md border border-border bg-white px-3 py-2"
                placeholder="payout.transitioned"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Limit
              <input
                type="number"
                min={1}
                max={200}
                value={take}
                onChange={(event) => setTake(Number(event.target.value))}
                className="rounded-md border border-border bg-white px-3 py-2"
              />
            </label>

            <button
              type="button"
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
              disabled={busyAction === "sign" || (ledger?.stats.unsigned ?? 0) === 0}
              onClick={() => void signBatch()}
            >
              {busyAction === "sign" ? "Signing..." : "Sign next batch"}
            </button>
          </div>
        </aside>

        <section className="grid gap-3">
          {ledger?.logs.length === 0 ? (
            <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
              <h2 className="text-2xl font-semibold">No audit events</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Workflow actions will appear here as operators and users move BD Select state.
              </p>
            </article>
          ) : null}

          {ledger?.logs.map((log) => (
            <article key={log.id} className="rounded-md border border-border bg-white p-4">
              <div className="grid gap-4 xl:grid-cols-[1fr_16rem]">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <span>{log.entity}</span>
                    <span>/</span>
                    <span>{log.action}</span>
                    <span>/</span>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">{log.action}</h2>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <p>Actor: {log.actor?.email ?? log.actor?.name ?? shortId(log.actorId)}</p>
                    <p>Entity id: {shortId(log.entityId)}</p>
                    <p>Request: {shortId(log.requestId)}</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-sm text-muted-foreground">Signature</p>
                    <p className="mt-1 font-semibold">{log.signaturePreview ?? "unsigned"}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-sm text-muted-foreground">Verification</p>
                    <p className="mt-1 font-semibold">{log.verified ? "Verified" : "Open"}</p>
                  </div>
                </div>
              </div>

              <details className="mt-4 rounded-md border border-border bg-background p-3">
                <summary className="cursor-pointer text-sm font-semibold">State payload</summary>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Before</p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs">
                      {jsonSummary(log.beforeState)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">After</p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs">
                      {jsonSummary(log.afterState)}
                    </pre>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
