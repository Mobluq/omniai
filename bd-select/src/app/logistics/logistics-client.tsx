"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  formatNgn,
  readApi,
  writeApi,
  type LogisticsShipmentSummary,
  type LogisticsWorkspaceSummary,
  type Persona,
  type ShipmentEventSummary,
} from "@/lib/client/api";

const couriers = ["gig", "sendbox", "topship", "kwik", "dhl", "manual"] as const;
const shipmentStatuses = [
  "label_created",
  "pickup_scheduled",
  "in_transit",
  "delivered",
  "failed",
  "returned",
  "cancelled",
] as const;

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shipmentEvents(value: LogisticsShipmentSummary["events"]): ShipmentEventSummary[] {
  if (!Array.isArray(value)) return [];
  return value.filter((event): event is ShipmentEventSummary => {
    return Boolean(event) && typeof event === "object" && "status" in event && "at" in event;
  });
}

function shipmentTitle(shipment: LogisticsShipmentSummary) {
  return (
    shipment.order?.listing?.title ??
    shipment.barterProposal?.targetListing?.title ??
    shipment.trackingNumber ??
    "Shipment"
  );
}

function shipmentContext(shipment: LogisticsShipmentSummary) {
  if (shipment.orderId) return "Order";
  if (shipment.barterProposalId) return "Barter";
  return "Manual";
}

function riskTone(risk?: string) {
  if (risk === "exception") return "bg-red-50 text-red-700 border-red-200";
  if (risk === "stale") return "bg-amber-50 text-amber-700 border-amber-200";
  if (risk === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-background text-muted-foreground border-border";
}

export function LogisticsClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [workspace, setWorkspace] = useState<LogisticsWorkspaceSummary>({
    shipments: [],
    eligibleOrders: [],
    eligibleBarters: [],
  });
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [courier, setCourier] = useState<(typeof couriers)[number]>("gig");
  const [trackingNumber, setTrackingNumber] = useState("BD-TRACK-001");
  const [hubCode, setHubCode] = useState("lekki-phase-1");
  const [insuredValueNgn, setInsuredValueNgn] = useState(150_000);
  const [eventStatus, setEventStatus] = useState<(typeof shipmentStatuses)[number]>("delivered");
  const [eventNote, setEventNote] = useState("Carrier scan received at BD Select hub.");
  const [eventLocation, setEventLocation] = useState("Lagos hub");
  const [message, setMessage] = useState("Loading logistics hub.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const selectedShipment = useMemo(() => {
    return (
      workspace.shipments.find((shipment) => shipment.id === selectedShipmentId) ??
      workspace.shipments[0] ??
      null
    );
  }, [selectedShipmentId, workspace.shipments]);

  const stats = useMemo(() => {
    return workspace.shipments.reduce(
      (current, shipment) => {
        current.total += 1;
        if (shipment.status === "in_transit" || shipment.status === "pickup_scheduled")
          current.active += 1;
        if (shipment.status === "delivered") current.delivered += 1;
        if (
          shipment.risk === "exception" ||
          ["failed", "returned", "cancelled"].includes(shipment.status)
        ) {
          current.exceptions += 1;
        }
        if (shipment.orderId) current.orders += 1;
        if (shipment.barterProposalId) current.barter += 1;
        return current;
      },
      { total: 0, active: 0, delivered: 0, exceptions: 0, orders: 0, barter: 0 },
    );
  }, [workspace.shipments]);

  const loadWorkspace = useCallback(async (userId: string, preferredShipmentId?: string) => {
    if (!userId) return;

    const result = await readApi<LogisticsWorkspaceSummary>("/api/v1/logistics/shipments", userId);
    setWorkspace(result);
    setSelectedOrderId(result.eligibleOrders[0]?.id ?? "");
    setSelectedProposalId(result.eligibleBarters[0]?.id ?? "");
    setSelectedShipmentId((current) => {
      if (
        preferredShipmentId &&
        result.shipments.some((shipment) => shipment.id === preferredShipmentId)
      ) {
        return preferredShipmentId;
      }
      if (result.shipments.some((shipment) => shipment.id === current)) return current;
      return result.shipments[0]?.id ?? "";
    });
    setMessage(
      result.shipments.length
        ? "Logistics hub loaded."
        : "No shipments are visible for this persona.",
    );
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Logistics personas failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadWorkspace(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Logistics data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadWorkspace]);

  async function createOrderShipment() {
    if (!activeUserId || !selectedOrderId) {
      setMessage("Select an eligible paid order first.");
      return;
    }

    setBusyAction("order-shipment");
    try {
      const result = await writeApi<{ shipment: LogisticsShipmentSummary }>(
        "/api/v1/logistics/order-shipments",
        activeUserId,
        {
          orderId: selectedOrderId,
          courier,
          trackingNumber,
          hubCode,
          insuredValueNgn,
        },
      );
      setMessage("Order shipment created.");
      await loadWorkspace(activeUserId, result.shipment.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order shipment failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createBarterShipment() {
    if (!activeUserId || !selectedProposalId) {
      setMessage("Select an accepted barter proposal first.");
      return;
    }

    setBusyAction("barter-shipment");
    try {
      const result = await writeApi<{ shipment: LogisticsShipmentSummary }>(
        "/api/v1/logistics/barter-shipments",
        activeUserId,
        {
          proposalId: selectedProposalId,
          courier,
          trackingNumber,
          hubCode,
          insuredValueNgn,
        },
      );
      setMessage("Barter shipment created.");
      await loadWorkspace(activeUserId, result.shipment.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Barter shipment failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function recordEvent() {
    if (!activeUserId || !selectedShipment) {
      setMessage("Select a shipment first.");
      return;
    }

    setBusyAction("event");
    try {
      await writeApi(`/api/v1/logistics/shipments/${selectedShipment.id}/events`, activeUserId, {
        status: eventStatus,
        note: eventNote,
        location: eventLocation,
      });
      setMessage(`Shipment event recorded: ${labelize(eventStatus)}.`);
      await loadWorkspace(activeUserId, selectedShipment.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Shipment event failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/orders" className="text-sm font-semibold text-muted-foreground">
            Back to orders
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Logistics operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Shipping hub</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Create shipments, track order and barter movement, record carrier events, and surface
            delivery exceptions before escrow or hub review moves forward.
          </p>
        </div>
        <PersonaSelector
          label="Logistics persona"
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

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-6">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Shipments</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-2 text-3xl font-semibold">{stats.active}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Delivered</p>
          <p className="mt-2 text-3xl font-semibold">{stats.delivered}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Exceptions</p>
          <p className="mt-2 text-3xl font-semibold">{stats.exceptions}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="mt-2 text-3xl font-semibold">{stats.orders}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Barter</p>
          <p className="mt-2 text-3xl font-semibold">{stats.barter}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[21rem_1fr]">
        <aside className="grid h-fit gap-4">
          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="text-xl font-semibold">Create shipment</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Paid order
                <select
                  value={selectedOrderId}
                  onChange={(event) => setSelectedOrderId(event.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  <option value="">No paid order</option>
                  {workspace.eligibleOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.listing.title} / {formatNgn(order.grossNgn)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Accepted barter
                <select
                  value={selectedProposalId}
                  onChange={(event) => setSelectedProposalId(event.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  <option value="">No barter proposal</option>
                  {workspace.eligibleBarters.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      {proposal.targetListing.title} / {labelize(proposal.status)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="grid gap-2 text-sm font-medium">
                  Courier
                  <select
                    value={courier}
                    onChange={(event) =>
                      setCourier(event.target.value as (typeof couriers)[number])
                    }
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    {couriers.map((item) => (
                      <option key={item} value={item}>
                        {labelize(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Tracking
                  <input
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Hub
                  <input
                    value={hubCode}
                    onChange={(event) => setHubCode(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Insured value
                  <input
                    type="number"
                    min={0}
                    value={insuredValueNgn}
                    onChange={(event) => setInsuredValueNgn(Number(event.target.value))}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={!selectedOrderId || busyAction === "order-shipment"}
                onClick={() => void createOrderShipment()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busyAction === "order-shipment" ? "Creating..." : "Create order shipment"}
              </button>
              <button
                type="button"
                disabled={!selectedProposalId || busyAction === "barter-shipment"}
                onClick={() => void createBarterShipment()}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busyAction === "barter-shipment" ? "Creating..." : "Create barter shipment"}
              </button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="text-xl font-semibold">Record event</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Status
                <select
                  value={eventStatus}
                  onChange={(event) =>
                    setEventStatus(event.target.value as (typeof shipmentStatuses)[number])
                  }
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  {shipmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {labelize(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Location
                <input
                  value={eventLocation}
                  onChange={(event) => setEventLocation(event.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Note
                <textarea
                  value={eventNote}
                  rows={3}
                  onChange={(event) => setEventNote(event.target.value)}
                  className="resize-none rounded-md border border-border bg-white px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={!selectedShipment || busyAction === "event"}
                onClick={() => void recordEvent()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busyAction === "event" ? "Recording..." : "Record shipment event"}
              </button>
            </div>
          </section>
        </aside>

        <section className="grid gap-5 lg:grid-cols-[0.42fr_1fr]">
          <section className="rounded-md border border-border bg-white">
            <div className="border-b border-border p-4">
              <h2 className="text-xl font-semibold">Shipment queue</h2>
            </div>
            <div className="max-h-[55rem] overflow-y-auto">
              {workspace.shipments.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No visible shipments.</div>
              ) : null}

              {workspace.shipments.map((shipment) => {
                const selected = shipment.id === selectedShipment?.id;
                return (
                  <button
                    key={shipment.id}
                    type="button"
                    onClick={() => setSelectedShipmentId(shipment.id)}
                    className={`grid w-full gap-2 border-b border-border p-4 text-left ${
                      selected ? "bg-background" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {shipmentContext(shipment)} / {labelize(shipment.status)}
                      </p>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${riskTone(shipment.risk)}`}
                      >
                        {labelize(shipment.risk ?? "active")}
                      </span>
                    </div>
                    <h3 className="font-semibold">{shipmentTitle(shipment)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {labelize(shipment.courier)} / {shipment.trackingNumber ?? "No tracking"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-h-[55rem] rounded-md border border-border bg-white">
            {selectedShipment ? (
              <div>
                <header className="border-b border-border p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {shipmentContext(selectedShipment)} / {labelize(selectedShipment.status)} /{" "}
                    {labelize(selectedShipment.courier)}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold">{shipmentTitle(selectedShipment)}</h2>
                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                    <p>Tracking: {selectedShipment.trackingNumber ?? "Not set"}</p>
                    <p>Hub: {selectedShipment.hubCode ?? "Not set"}</p>
                    <p>Delivered: {formatDate(selectedShipment.deliveredAt)}</p>
                    <p>
                      Shipper:{" "}
                      {selectedShipment.shipper?.email ?? selectedShipment.shipperId ?? "n/a"}
                    </p>
                    <p>
                      Recipient:{" "}
                      {selectedShipment.recipient?.email ?? selectedShipment.recipientId ?? "n/a"}
                    </p>
                    <p>Insured: {formatNgn(selectedShipment.insuredValueNgn ?? 0)}</p>
                  </div>
                </header>

                <div className="grid gap-3 p-5">
                  {shipmentEvents(selectedShipment.events).length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-background p-8 text-center">
                      <h3 className="text-2xl font-semibold">No carrier events</h3>
                      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                        Events recorded by sellers, support, or courier webhooks will appear here.
                      </p>
                    </div>
                  ) : null}

                  {shipmentEvents(selectedShipment.events).map((event, index) => (
                    <article
                      key={`${event.status}-${event.at}-${index}`}
                      className="rounded-md border border-border bg-background p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold">{labelize(event.status)}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(event.at)}</p>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                        <p>Source: {labelize(event.source ?? "operator")}</p>
                        <p>Location: {event.location ?? "Not set"}</p>
                        <p>Note: {event.note ?? "No note"}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[55rem] place-items-center p-8 text-center">
                <div>
                  <h2 className="text-3xl font-semibold">No shipment selected</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    Create or select a shipment to inspect tracking events and case context.
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
