"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  formatNgn,
  readApi,
  writeApi,
  type DisputeSummary,
  type Persona,
  type ReviewQueueItem,
} from "@/lib/client/api";

const tabs = ["review", "disputes"] as const;
const queueDecisions = ["approve", "reject", "request_more_photos", "escalate"] as const;
const disputeDecisions = [
  "refund_buyer",
  "partial_payout",
  "require_return",
  "reject_claim",
] as const;

type Tab = (typeof tabs)[number];
type QueueDecision = (typeof queueDecisions)[number];
type DisputeDecision = (typeof disputeDecisions)[number];

const queueDecisionReasons: Record<QueueDecision, string> = {
  approve:
    "Photos, price band, seller history, and brand signals satisfy BD Select authentication standards.",
  reject: "Authentication risk is too high for a public BD Select listing.",
  request_more_photos: "Required review angles or quality thresholds are incomplete.",
  escalate: "Listing needs senior authentication review before a final decision.",
};

const disputeResolutionCopy: Record<DisputeDecision, { label: string; resolution: string }> = {
  refund_buyer: {
    label: "Refund buyer",
    resolution:
      "Buyer claim accepted. Escrow is marked for refund and the item is returned to availability.",
  },
  partial_payout: {
    label: "Partial payout",
    resolution: "Mixed evidence. Release an adjusted seller payout while closing buyer claim.",
  },
  require_return: {
    label: "Require return",
    resolution:
      "Return required before final closure. Escrow stays refund-oriented in the MVP state model.",
  },
  reject_claim: {
    label: "Reject claim",
    resolution: "Claim rejected after evidence review. Seller payout is queued from escrow.",
  },
};

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dueLabel(value: string | null) {
  if (!value) return "No SLA";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function scoreLabel(value: number | null | undefined) {
  return typeof value === "number" ? `${value}/100` : "not scored";
}

export function AdminOperationsClient() {
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [message, setMessage] = useState("Loading admin operations.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const stats = useMemo(() => {
    const attentionQueue = queue.filter((item) =>
      ["escalated", "needs_more_info"].includes(item.status),
    ).length;
    const disputedEscrow = disputes.reduce(
      (total, dispute) => total + (dispute.order?.grossNgn ?? 0),
      0,
    );
    return {
      queue: queue.length,
      attentionQueue,
      disputes: disputes.length,
      disputedEscrow,
    };
  }, [disputes, queue]);

  const loadOperations = useCallback(async (userId: string) => {
    if (!userId) return;
    const [queueResult, disputeResult] = await Promise.all([
      readApi<{ queue: ReviewQueueItem[] }>("/api/v1/admin/queue", userId),
      readApi<{ disputes: DisputeSummary[] }>("/api/v1/admin/disputes", userId),
    ]);
    setQueue(queueResult.queue);
    setDisputes(disputeResult.disputes);
    setMessage("Admin operations loaded.");
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Admin operations failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadOperations(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Admin operations failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadOperations]);

  async function decideQueueItem(item: ReviewQueueItem, decision: QueueDecision) {
    if (!activeUserId) {
      setMessage("Select an admin persona first.");
      return;
    }

    const actionKey = `${item.id}:${decision}`;
    setBusyAction(actionKey);

    try {
      await writeApi(`/api/v1/admin/queue/${item.id}/decide`, activeUserId, {
        decision,
        decisionReason: queueDecisionReasons[decision],
        aiSignals: {
          operatorDecision: decision,
          reviewedFrom: "admin_operations",
        },
      });
      setMessage(`Review decision recorded: ${labelize(decision)}.`);
      await loadOperations(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review decision failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function resolveDispute(dispute: DisputeSummary, decision: DisputeDecision) {
    if (!activeUserId) {
      setMessage("Select an admin persona first.");
      return;
    }

    const actionKey = `${dispute.id}:${decision}`;
    setBusyAction(actionKey);

    try {
      await writeApi(`/api/v1/admin/disputes/${dispute.id}/resolve`, activeUserId, {
        decision,
        resolution: disputeResolutionCopy[decision].resolution,
        sellerPayoutNgn:
          decision === "partial_payout" && dispute.order
            ? Math.round(dispute.order.payoutNgn / 2)
            : undefined,
      });
      setMessage(`Dispute resolved: ${disputeResolutionCopy[decision].label}.`);
      await loadOperations(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dispute resolution failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-muted-foreground">
            Back to BD Select
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Admin operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Trust desk</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Decide authentication queue items, inspect disputed escrow orders, and record auditable
            outcomes for support and finance handoff.
          </p>
        </div>
        <div className="grid gap-3">
          <PersonaSelector
            label="Operator persona"
            personas={personas}
            activeUserId={activeUserId}
            onChange={setActiveUserId}
          />
          <Link
            href="/admin/audit"
            className="rounded-md border border-border bg-white px-3 py-2 text-center text-sm font-semibold"
          >
            Open audit center
          </Link>
          <Link
            href="/evidence"
            className="rounded-md border border-border bg-white px-3 py-2 text-center text-sm font-semibold"
          >
            Open evidence vault
          </Link>
          <Link
            href="/logistics"
            className="rounded-md border border-border bg-white px-3 py-2 text-center text-sm font-semibold"
          >
            Open logistics hub
          </Link>
          <Link
            href="/admin/risk"
            className="rounded-md border border-border bg-white px-3 py-2 text-center text-sm font-semibold"
          >
            Open risk center
          </Link>
          <Link
            href="/admin/insights"
            className="rounded-md border border-border bg-white px-3 py-2 text-center text-sm font-semibold"
          >
            Open insights
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? (
          <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span>
        ) : null}
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-4">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Review queue</p>
          <p className="mt-2 text-3xl font-semibold">{stats.queue}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Needs attention</p>
          <p className="mt-2 text-3xl font-semibold">{stats.attentionQueue}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Open disputes</p>
          <p className="mt-2 text-3xl font-semibold">{stats.disputes}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Disputed value</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.disputedEscrow)}</p>
        </article>
      </section>

      <nav className="mx-auto mt-5 flex max-w-7xl flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${
              activeTab === tab
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white"
            }`}
          >
            {labelize(tab)}
          </button>
        ))}
      </nav>

      <section className="mx-auto mt-5 max-w-7xl">
        {activeTab === "review" ? (
          <div className="grid gap-4">
            {queue.length === 0 ? (
              <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
                <h2 className="text-2xl font-semibold">No active review items</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Submitted listings will appear here with media, pricing signals, and queue
                  actions.
                </p>
              </article>
            ) : null}

            {queue.map((item) => {
              const image = item.listing.photos?.[0]?.url;
              return (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-md border border-border bg-white p-4 lg:grid-cols-[12rem_1fr_22rem]"
                >
                  <div className="overflow-hidden rounded-md bg-background">
                    <div className="aspect-square">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={item.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">
                          BD Select
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {item.listing.brand?.name ?? "Independent"} / {item.listing.condition} /{" "}
                      {labelize(item.status)}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{item.listing.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.listing.description}
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">Price</dt>
                        <dd className="mt-1 font-semibold">{formatNgn(item.listing.priceNgn)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Authenticity</dt>
                        <dd className="mt-1 font-semibold">
                          {scoreLabel(item.listing.aiAuthenticityScore)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Price score</dt>
                        <dd className="mt-1 font-semibold">
                          {scoreLabel(item.listing.aiPriceScore)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SLA</dt>
                        <dd className="mt-1 font-semibold">{dueLabel(item.slaDueAt)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(item.listing.photos ?? []).map((photo) => (
                        <span
                          key={photo.id}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold"
                        >
                          {labelize(photo.role)} {scoreLabel(photo.qualityScore)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid h-fit gap-2">
                    {queueDecisions.map((decision) => (
                      <button
                        key={decision}
                        type="button"
                        className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 data-[primary=true]:bg-primary data-[primary=true]:text-primary-foreground"
                        data-primary={decision === "approve"}
                        disabled={busyAction === `${item.id}:${decision}`}
                        onClick={() => void decideQueueItem(item, decision)}
                      >
                        {busyAction === `${item.id}:${decision}` ? "Saving..." : labelize(decision)}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {activeTab === "disputes" ? (
          <div className="grid gap-4">
            {disputes.length === 0 ? (
              <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
                <h2 className="text-2xl font-semibold">No active disputes</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Buyer or seller disputes from the order center will appear here with escrow
                  context.
                </p>
              </article>
            ) : null}

            {disputes.map((dispute) => {
              const order = dispute.order;
              const image = order?.listing.photos?.[0]?.url;
              return (
                <article
                  key={dispute.id}
                  className="grid gap-4 rounded-md border border-border bg-white p-4 lg:grid-cols-[12rem_1fr_22rem]"
                >
                  <div className="overflow-hidden rounded-md bg-background">
                    <div className="aspect-square">
                      {image && order ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={order.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">
                          Dispute
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {labelize(dispute.reasonCode)} / {labelize(dispute.status)}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {order?.listing.title ?? "Barter dispute"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Raised by{" "}
                      {dispute.raisedBy.email ?? dispute.raisedBy.name ?? dispute.raisedBy.id}.
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">Order status</dt>
                        <dd className="mt-1 font-semibold">
                          {order ? labelize(order.status) : "No order"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Escrow</dt>
                        <dd className="mt-1 font-semibold">
                          {order ? labelize(order.escrowState) : "No escrow"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Gross</dt>
                        <dd className="mt-1 font-semibold">{formatNgn(order?.grossNgn ?? 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Payout</dt>
                        <dd className="mt-1 font-semibold">{formatNgn(order?.payoutNgn ?? 0)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                      <p>Buyer: {order?.buyer?.email ?? order?.buyerId ?? "n/a"}</p>
                      <p>Seller: {order?.seller?.email ?? order?.sellerId ?? "n/a"}</p>
                      <p>
                        Evidence: {dispute.evidence ? JSON.stringify(dispute.evidence) : "none"}
                      </p>
                    </div>
                  </div>

                  <div className="grid h-fit gap-2">
                    {disputeDecisions.map((decision) => (
                      <button
                        key={decision}
                        type="button"
                        className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 data-[primary=true]:bg-primary data-[primary=true]:text-primary-foreground"
                        data-primary={decision === "reject_claim"}
                        disabled={busyAction === `${dispute.id}:${decision}`}
                        onClick={() => void resolveDispute(dispute, decision)}
                      >
                        {busyAction === `${dispute.id}:${decision}`
                          ? "Resolving..."
                          : disputeResolutionCopy[decision].label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
