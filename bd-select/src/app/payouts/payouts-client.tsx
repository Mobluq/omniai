"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import { formatNgn, readApi, writeApi, type PayoutSummary, type Persona } from "@/lib/client/api";

const payoutActions = ["start_processing", "mark_paid", "mark_failed", "cancel"] as const;
type PayoutAction = (typeof payoutActions)[number];

const actionLabels: Record<PayoutAction, string> = {
  start_processing: "Start processing",
  mark_paid: "Mark paid",
  mark_failed: "Mark failed",
  cancel: "Cancel",
};

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not released";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function canRunAction(payout: PayoutSummary, action: PayoutAction) {
  if (action === "start_processing") return ["pending", "queued", "failed"].includes(payout.status);
  if (action === "mark_paid") return ["queued", "processing"].includes(payout.status);
  if (action === "mark_failed") return ["queued", "processing"].includes(payout.status);
  return ["pending", "queued", "failed"].includes(payout.status);
}

export function PayoutsClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [payouts, setPayouts] = useState<PayoutSummary[]>([]);
  const [message, setMessage] = useState("Loading payout operations.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const stats = useMemo(() => {
    return payouts.reduce(
      (current, payout) => {
        current.total += payout.amountNgn;
        if (payout.status === "queued") current.queued += payout.amountNgn;
        if (payout.status === "processing") current.processing += payout.amountNgn;
        if (payout.status === "failed") current.failed += 1;
        return current;
      },
      { total: 0, queued: 0, processing: 0, failed: 0 },
    );
  }, [payouts]);

  const loadPayouts = useCallback(async (userId: string) => {
    if (!userId) return;
    const result = await readApi<{ payouts: PayoutSummary[] }>("/api/v1/admin/payouts", userId);
    setPayouts(result.payouts);
    setMessage(result.payouts.length ? "Payouts loaded." : "No active payouts.");
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Payout operations failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadPayouts(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Payouts failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadPayouts]);

  async function runAction(payout: PayoutSummary, action: PayoutAction) {
    if (!activeUserId) {
      setMessage("Select an admin persona first.");
      return;
    }

    const actionKey = `${payout.id}:${action}`;
    setBusyAction(actionKey);

    try {
      await writeApi(`/api/v1/admin/payouts/${payout.id}/transition`, activeUserId, {
        action,
        processorReference: action === "mark_paid" ? `manual_${payout.id}` : undefined,
        note: `${actionLabels[action]} from BD Select payout operations.`,
      });
      setMessage(`Payout updated: ${actionLabels[action]}.`);
      await loadPayouts(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payout action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-muted-foreground">
            Back to admin ops
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Finance operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Payout desk</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review seller payout batches, verify escrow release state, and record processor outcomes
            with audit-backed transitions.
          </p>
        </div>
        <PersonaSelector
          label="Finance persona"
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
          <p className="text-sm text-muted-foreground">Active value</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.total)}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Queued</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.queued)}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.processing)}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Failed count</p>
          <p className="mt-2 text-3xl font-semibold">{stats.failed}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-4">
        {payouts.length === 0 ? (
          <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
            <h2 className="text-2xl font-semibold">No active payouts</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Complete an escrowed order or resolve a seller-favoring dispute to queue payouts here.
            </p>
            <Link
              href="/orders"
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Open orders
            </Link>
          </article>
        ) : null}

        {payouts.map((payout) => {
          const image = payout.order.listing.photos?.[0]?.url;
          return (
            <article
              key={payout.id}
              className="grid gap-4 rounded-md border border-border bg-white p-4 lg:grid-cols-[12rem_1fr_20rem]"
            >
              <div className="overflow-hidden rounded-md bg-background">
                <div className="aspect-square">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={payout.order.listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">Payout</div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {labelize(payout.status)} / escrow {labelize(payout.order.escrowState)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{payout.order.listing.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Seller {payout.seller.email ?? payout.seller.name ?? payout.seller.id} receives{" "}
                  {formatNgn(payout.amountNgn)} for completed order {payout.order.id}.
                </p>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Payout</dt>
                    <dd className="mt-1 font-semibold">{formatNgn(payout.amountNgn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Order gross</dt>
                    <dd className="mt-1 font-semibold">{formatNgn(payout.order.grossNgn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Bank token</dt>
                    <dd className="mt-1 font-semibold">ending {payout.bankAccountTokenLast4}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Released</dt>
                    <dd className="mt-1 font-semibold">{formatDate(payout.releasedAt)}</dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <p>Buyer: {payout.order.buyer?.email ?? payout.order.buyerId}</p>
                  <p>Processor: {payout.processorReference ?? "not assigned"}</p>
                  <p>Disputes: {payout.order.disputes.length}</p>
                </div>
              </div>

              <div className="grid h-fit gap-2">
                {payoutActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 data-[primary=true]:bg-primary data-[primary=true]:text-primary-foreground"
                    data-primary={action === "mark_paid"}
                    disabled={!canRunAction(payout, action) || busyAction === `${payout.id}:${action}`}
                    onClick={() => void runAction(payout, action)}
                  >
                    {busyAction === `${payout.id}:${action}` ? "Saving..." : actionLabels[action]}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
