import crypto from "node:crypto";
import type { ShipmentCourier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertMarketplace } from "@/modules/marketplace/errors";

export function verifyPaystackSignature(rawBody: string, signature: string | null, secret?: string) {
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature) return false;
  const digest = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export function verifyFlutterwaveSignature(signature: string | null, secret?: string) {
  if (!secret) return process.env.NODE_ENV !== "production";
  return Boolean(
    signature &&
      signature.length === secret.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(secret)),
  );
}

function readString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function readObject(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export class WebhookService {
  async recordPaymentSuccess(provider: "paystack" | "flutterwave", payload: Record<string, unknown>) {
    const data = readObject(payload, "data") ?? payload;
    const reference = readString(data, ["reference", "tx_ref", "flw_ref"]);
    assertMarketplace(reference, "webhook_reference_missing", "Webhook payment reference is missing.", 422);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { reference },
        include: { order: true },
      });

      assertMarketplace(payment, "payment_not_found", "Payment reference was not found.", 404);

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          paidAt: payment.paidAt ?? new Date(),
          metadata: {
            provider,
            webhookEvent: readString(payload, ["event", "event.type"]) ?? "payment.success",
          },
        },
      });

      let updatedOrder = payment.order;
      if (payment.order && payment.order.status === "pending_payment") {
        updatedOrder = await tx.order.update({
          where: { id: payment.order.id },
          data: { status: "paid", escrowState: "held", paidAt: payment.order.paidAt ?? new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          action: `webhook.${provider}.payment_success`,
          entity: "Payment",
          entityId: payment.id,
          beforeState: { paymentStatus: payment.status, orderStatus: payment.order?.status },
          afterState: { paymentStatus: updatedPayment.status, orderStatus: updatedOrder?.status },
          metadata: { provider },
        },
      });

      return { payment: updatedPayment, order: updatedOrder };
    });
  }

  async recordShipmentEvent(courier: ShipmentCourier, payload: Record<string, unknown>) {
    const trackingNumber = readString(payload, ["trackingNumber", "tracking_number", "waybill", "awb"]);
    assertMarketplace(trackingNumber, "tracking_number_missing", "Webhook tracking number is missing.", 422);

    const rawStatus = readString(payload, ["status", "shipment_status", "event"])?.toLowerCase() ?? "";
    const status = rawStatus.includes("deliver")
      ? "delivered"
      : rawStatus.includes("return")
        ? "returned"
        : rawStatus.includes("fail")
          ? "failed"
          : "in_transit";

    return prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findFirst({
        where: { trackingNumber, courier },
        include: { order: true },
      });

      assertMarketplace(shipment, "shipment_not_found", "Shipment was not found.", 404);

      const now = new Date();
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status,
          deliveredAt: status === "delivered" ? now : shipment.deliveredAt,
          events: [...(Array.isArray(shipment.events) ? shipment.events : []), { status, at: now.toISOString() }],
        },
      });

      let updatedOrder = shipment.order;
      if (shipment.order && status === "delivered" && shipment.order.status === "shipped") {
        updatedOrder = await tx.order.update({
          where: { id: shipment.order.id },
          data: { status: "delivered", deliveredAt: now },
        });
      }

      await tx.auditLog.create({
        data: {
          action: `webhook.${courier}.shipment_event`,
          entity: "Shipment",
          entityId: shipment.id,
          beforeState: { shipmentStatus: shipment.status, orderStatus: shipment.order?.status },
          afterState: { shipmentStatus: updatedShipment.status, orderStatus: updatedOrder?.status },
          metadata: { courier },
        },
      });

      return { shipment: updatedShipment, order: updatedOrder };
    });
  }
}
