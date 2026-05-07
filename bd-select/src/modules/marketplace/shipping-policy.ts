import type { ShipmentStatus } from "@prisma/client";

export const shipmentEventStatuses = [
  "label_created",
  "pickup_scheduled",
  "in_transit",
  "delivered",
  "failed",
  "returned",
  "cancelled",
] as const;

export type ShipmentEventStatus = (typeof shipmentEventStatuses)[number];

export type ShipmentEventRecord = {
  status: ShipmentEventStatus;
  at: string;
  source: "seller" | "operator" | "courier_webhook" | "seed";
  note?: string;
  location?: string;
};

export function isShipmentEventStatus(value: string): value is ShipmentEventStatus {
  return shipmentEventStatuses.includes(value as ShipmentEventStatus);
}

export function isShipmentException(status: ShipmentStatus | ShipmentEventStatus) {
  return status === "failed" || status === "returned" || status === "cancelled";
}

export function shipmentStateLabel(status: ShipmentStatus | ShipmentEventStatus) {
  if (status === "label_created") return "Label created";
  if (status === "pickup_scheduled") return "Pickup scheduled";
  if (status === "in_transit") return "In transit";
  if (status === "delivered") return "Delivered";
  if (status === "failed") return "Failed";
  if (status === "returned") return "Returned";
  return "Cancelled";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeSource(value: unknown): ShipmentEventRecord["source"] {
  if (
    value === "seller" ||
    value === "operator" ||
    value === "courier_webhook" ||
    value === "seed"
  ) {
    return value;
  }
  return "operator";
}

function normalizeShipmentEvent(value: unknown): ShipmentEventRecord | null {
  if (!isRecord(value)) return null;

  const status = readString(value.status);
  const at = readString(value.at);
  if (!status || !isShipmentEventStatus(status) || !at) return null;

  return {
    status,
    at,
    source: normalizeSource(value.source),
    note: readString(value.note) ?? undefined,
    location: readString(value.location) ?? undefined,
  };
}

export function normalizeShipmentEvents(value: unknown): ShipmentEventRecord[] {
  return Array.isArray(value)
    ? value
        .map(normalizeShipmentEvent)
        .filter((event): event is ShipmentEventRecord => Boolean(event))
        .sort((left, right) => left.at.localeCompare(right.at))
    : [];
}

export function appendShipmentEvent(
  events: unknown,
  event: Omit<ShipmentEventRecord, "source"> & { source?: ShipmentEventRecord["source"] },
) {
  return [
    ...normalizeShipmentEvents(events),
    {
      ...event,
      source: event.source ?? "operator",
    },
  ].sort((left, right) => left.at.localeCompare(right.at));
}

export function shipmentRisk(
  status: ShipmentStatus | ShipmentEventStatus,
  updatedAt?: Date | string | null,
) {
  if (isShipmentException(status)) return "exception";
  if (status === "delivered") return "closed";
  if (!updatedAt) return "active";

  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (status === "in_transit" && ageMs > 5 * 24 * 60 * 60 * 1000) return "stale";
  return "active";
}

export function shouldMoveBarterToReview(statuses: ShipmentStatus[]) {
  return statuses.length >= 2 && statuses.every((status) => status === "delivered");
}
