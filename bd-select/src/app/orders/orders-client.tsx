"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import { formatNgn, readApi, writeApi, type OrderSummary, type Persona } from "@/lib/client/api";

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function actorRole(order: OrderSummary, activeUserId: string) {
  if (order.buyerId === activeUserId) return "buyer";
  if (order.sellerId === activeUserId) return "seller";
  return "observer";
}

function nextStep(order: OrderSummary, activeUserId: string) {
  const role = actorRole(order, activeUserId);
  if (order.status === "pending_payment") {
    return role === "buyer" ? "Pay to move funds into escrow." : "Waiting for buyer payment.";
  }
  if (order.status === "paid") {
    return role === "seller" ? "Create shipment and hand off to logistics." : "Waiting for seller shipment.";
  }
  if (order.status === "shipped" || order.status === "delivered") {
    return role === "buyer" ? "Confirm delivery or open a dispute." : "Waiting for buyer delivery confirmation.";
  }
  if (order.status === "completed") return "Review the other participant and prepare payout release.";
  if (order.status === "disputed") return "Escrow is held while support resolves the case.";
  return "No action required.";
}

function canReview(order: OrderSummary, activeUserId: string) {
  return (
    order.status === "completed" &&
    (order.buyerId === activeUserId || order.sellerId === activeUserId) &&
    !order.reviews.some((review) => review.authorId === activeUserId)
  );
}

type OrderAction = "pay" | "ship" | "confirm" | "dispute" | "review";

export function OrdersClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [message, setMessage] = useState("Loading order center.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const stats = useMemo(() => {
    return orders.reduce(
      (current, order) => {
        current.total += order.grossNgn + order.buyerFeeNgn + order.shippingFeeNgn;
        if (order.escrowState === "held") current.held += 1;
        if (order.status === "disputed") current.disputed += 1;
        return current;
      },
      { total: 0, held: 0, disputed: 0 },
    );
  }, [orders]);

  const loadOrders = useCallback(async (userId: string) => {
    if (!userId) return;
    const result = await readApi<{ orders: OrderSummary[] }>("/api/v1/orders", userId);
    setOrders(result.orders);
    setMessage(result.orders.length ? "Orders loaded." : "No orders for this persona yet.");
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const buyer = result.users.find((persona) => persona.role === "buyer") ?? result.users[0];
        setActiveUserId(buyer?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Order center failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadOrders(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Orders failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadOrders]);

  async function runAction(order: OrderSummary, action: OrderAction) {
    if (!activeUserId) {
      setMessage("Select a persona first.");
      return;
    }

    const actionKey = `${order.id}:${action}`;
    setBusyAction(actionKey);

    try {
      if (action === "pay") {
        await writeApi(`/api/v1/orders/${order.id}/pay`, activeUserId, {
          processor: "manual",
          channel: "transfer",
        });
        setMessage("Payment recorded and escrow is now held.");
      }

      if (action === "ship") {
        await writeApi(`/api/v1/orders/${order.id}/ship`, activeUserId, {
          courier: "gig",
          trackingNumber: `GIG-${order.id.slice(-8).toUpperCase()}`,
          hubCode: "lekki-phase-1",
          insuredValueNgn: order.grossNgn,
        });
        setMessage("Shipment created and order moved to shipped.");
      }

      if (action === "confirm") {
        await writeApi(`/api/v1/orders/${order.id}/confirm-delivery`, activeUserId);
        setMessage("Delivery confirmed and payout release queued.");
      }

      if (action === "dispute") {
        await writeApi(`/api/v1/orders/${order.id}/dispute`, activeUserId, {
          reasonCode: "not_as_described",
          evidence: {
            note: "Opened from the BD Select order center.",
          },
        });
        setMessage("Dispute opened. Escrow remains held.");
      }

      if (action === "review") {
        const targetId = activeUserId === order.buyerId ? order.sellerId : order.buyerId;
        await writeApi(`/api/v1/orders/${order.id}/reviews`, activeUserId, {
          targetId,
          stars: 5,
          body: "Smooth BD Select transaction.",
        });
        setMessage("Review saved and reputation updated.");
      }

      await loadOrders(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/marketplace" className="text-sm font-semibold text-muted-foreground">
            Back to marketplace
          </Link>
          <h1 className="mt-3 text-4xl font-semibold">Order center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Move escrowed orders through payment, shipment, delivery confirmation, disputes, and
            reputation from the buyer or seller side.
          </p>
        </div>
        <PersonaSelector
          label="Active persona"
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

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-3">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Visible orders</p>
          <p className="mt-2 text-3xl font-semibold">{orders.length}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Escrow held</p>
          <p className="mt-2 text-3xl font-semibold">{stats.held}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Gross visible value</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.total)}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-4">
        {orders.length === 0 ? (
          <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
            <h2 className="text-2xl font-semibold">No orders yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Create one from the marketplace, then return here to exercise the escrow workflow.
            </p>
            <Link
              href="/marketplace"
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Browse listings
            </Link>
          </article>
        ) : null}

        {orders.map((order) => {
          const image = order.listing.photos?.[0]?.url;
          const role = actorRole(order, activeUserId);
          const buyerTotal = order.grossNgn + order.buyerFeeNgn + order.shippingFeeNgn;
          const canPay = role === "buyer" && order.status === "pending_payment";
          const canShip = role === "seller" && order.status === "paid";
          const canConfirm = role === "buyer" && (order.status === "paid" || order.status === "shipped");
          const canDispute =
            (role === "buyer" || role === "seller") &&
            !["refunded", "cancelled", "completed"].includes(order.status) &&
            order.status !== "disputed";
          const orderBusy = (action: OrderAction) => busyAction === `${order.id}:${action}`;

          return (
            <article
              key={order.id}
              className="grid gap-4 rounded-md border border-border bg-white p-4 lg:grid-cols-[13rem_1fr_19rem]"
            >
              <Link href={`/marketplace/${order.listing.id}`} className="block overflow-hidden rounded-md bg-background">
                <div className="aspect-square">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={order.listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">BD Select</div>
                  )}
                </div>
              </Link>

              <div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <span>{labelize(order.status)}</span>
                  <span>/</span>
                  <span>Escrow {labelize(order.escrowState)}</span>
                  <span>/</span>
                  <span>You are {role}</span>
                </div>
                <Link href={`/marketplace/${order.listing.id}`}>
                  <h2 className="mt-2 text-2xl font-semibold">{order.listing.title}</h2>
                </Link>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextStep(order, activeUserId)}</p>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Buyer total</dt>
                    <dd className="mt-1 font-semibold">{formatNgn(buyerTotal)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Item</dt>
                    <dd className="mt-1 font-semibold">{formatNgn(order.grossNgn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="mt-1 font-semibold">{formatNgn(order.shippingFeeNgn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Seller payout</dt>
                    <dd className="mt-1 font-semibold">{formatNgn(order.payoutNgn)}</dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <p>Buyer: {order.buyer?.email ?? order.buyerId}</p>
                  <p>Seller: {order.seller?.email ?? order.sellerId}</p>
                  <p>Payments: {order.payments.length}</p>
                </div>

                {order.shipments[0] ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Shipment: {labelize(order.shipments[0].courier)} / {labelize(order.shipments[0].status)} /{" "}
                    {order.shipments[0].trackingNumber ?? "no tracking"}
                  </p>
                ) : null}
                {order.disputes[0] ? (
                  <p className="mt-3 text-xs font-semibold text-foreground">
                    Dispute: {labelize(order.disputes[0].reasonCode)} / {labelize(order.disputes[0].status)}
                  </p>
                ) : null}
              </div>

              <div className="grid h-fit gap-2">
                <button
                  type="button"
                  className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canPay || orderBusy("pay")}
                  onClick={() => void runAction(order, "pay")}
                >
                  {orderBusy("pay") ? "Recording..." : "Record payment"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canShip || orderBusy("ship")}
                  onClick={() => void runAction(order, "ship")}
                >
                  {orderBusy("ship") ? "Shipping..." : "Create shipment"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canConfirm || orderBusy("confirm")}
                  onClick={() => void runAction(order, "confirm")}
                >
                  {orderBusy("confirm") ? "Confirming..." : "Confirm delivery"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canDispute || orderBusy("dispute")}
                  onClick={() => void runAction(order, "dispute")}
                >
                  {orderBusy("dispute") ? "Opening..." : "Open dispute"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canReview(order, activeUserId) || orderBusy("review")}
                  onClick={() => void runAction(order, "review")}
                >
                  {orderBusy("review") ? "Saving..." : "Leave review"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
