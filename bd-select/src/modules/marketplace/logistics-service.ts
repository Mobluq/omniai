import type {
  BarterProposalStatus,
  Prisma,
  ShipmentCourier,
  ShipmentStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sanitizeUserText } from "@/lib/security/request-context";
import { canManageMarketplace } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";
import {
  appendShipmentEvent,
  isShipmentException,
  shouldMoveBarterToReview,
  shipmentRisk,
  type ShipmentEventRecord,
} from "@/modules/marketplace/shipping-policy";

export type CreateOrderShipmentInput = {
  actorId: string;
  orderId: string;
  courier: ShipmentCourier;
  trackingNumber: string;
  labelUrl?: string;
  hubCode?: string;
  insuredValueNgn?: number;
};

export type CreateBarterShipmentInput = {
  actorId: string;
  proposalId: string;
  courier: ShipmentCourier;
  trackingNumber: string;
  labelUrl?: string;
  hubCode?: string;
  insuredValueNgn?: number;
};

export type RecordShipmentEventInput = {
  actorId: string;
  shipmentId: string;
  status: ShipmentStatus;
  note?: string;
  location?: string;
};

const listingInclude = {
  brand: true,
  category: true,
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  seller: { select: { id: true, name: true, sellerScore: true } },
} satisfies Prisma.ListingInclude;

const orderInclude = {
  listing: { include: listingInclude },
  buyer: { select: { id: true, name: true, email: true } },
  seller: { select: { id: true, name: true, email: true, sellerScore: true } },
  payments: { orderBy: { createdAt: "desc" as const } },
  shipments: { orderBy: { createdAt: "desc" as const } },
  disputes: { orderBy: { createdAt: "desc" as const } },
  reviews: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OrderInclude;

const barterProposalInclude = {
  initiator: { select: { id: true, name: true, email: true } },
  recipient: { select: { id: true, name: true, email: true } },
  topUpPayer: { select: { id: true, name: true, email: true } },
  targetListing: { include: listingInclude },
  offeredListings: {
    include: {
      offeredBy: { select: { id: true, name: true, email: true } },
      listing: { include: listingInclude },
    },
    orderBy: { createdAt: "asc" as const },
  },
  payments: { orderBy: { createdAt: "desc" as const } },
  shipments: { orderBy: { createdAt: "desc" as const } },
  disputes: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.BarterProposalInclude;

const shipmentInclude = {
  shipper: { select: { id: true, name: true, email: true, role: true } },
  recipient: { select: { id: true, name: true, email: true, role: true } },
  order: { include: orderInclude },
  barterProposal: { include: barterProposalInclude },
} satisfies Prisma.ShipmentInclude;

type LogisticsShipment = Prisma.ShipmentGetPayload<{ include: typeof shipmentInclude }>;

function cleanOptionalText(value?: string) {
  const clean = value ? sanitizeUserText(value).trim() : "";
  return clean.length > 0 ? clean.slice(0, 240) : undefined;
}

function assertCanAccessShipment(
  actor: { id: string; role: UserRole },
  shipment: LogisticsShipment,
) {
  const allowed =
    canManageMarketplace(actor.role) ||
    shipment.shipperId === actor.id ||
    shipment.recipientId === actor.id ||
    shipment.order?.buyerId === actor.id ||
    shipment.order?.sellerId === actor.id ||
    shipment.barterProposal?.initiatorId === actor.id ||
    shipment.barterProposal?.recipientId === actor.id;

  assertMarketplace(allowed, "forbidden", "You do not have access to this shipment.", 403);
}

function shipmentWhereForActor(actor: { id: string; role: UserRole }): Prisma.ShipmentWhereInput {
  if (canManageMarketplace(actor.role)) return {};

  return {
    OR: [
      { shipperId: actor.id },
      { recipientId: actor.id },
      { order: { is: { OR: [{ buyerId: actor.id }, { sellerId: actor.id }] } } },
      { barterProposal: { is: { OR: [{ initiatorId: actor.id }, { recipientId: actor.id }] } } },
    ],
  };
}

function presentShipment<T extends LogisticsShipment>(shipment: T) {
  return {
    ...shipment,
    risk: shipmentRisk(shipment.status, shipment.updatedAt),
  };
}

function eventSource(actor: { id: string; role: UserRole }): ShipmentEventRecord["source"] {
  return canManageMarketplace(actor.role) ? "operator" : "seller";
}

function barterStatusAfterShipment(
  statuses: ShipmentStatus[],
  currentStatus: BarterProposalStatus,
) {
  if (statuses.some(isShipmentException)) return "dispute";
  if (shouldMoveBarterToReview(statuses)) return "in_review";
  if (statuses.length >= 2 && currentStatus === "accepted") return "both_shipped";
  return currentStatus;
}

export class LogisticsService {
  async workspace(actorId: string) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true },
    });

    assertMarketplace(actor, "user_not_found", "User account was not found.", 404);

    const canManage = canManageMarketplace(actor.role);
    const [shipments, eligibleOrders, eligibleBarters] = await Promise.all([
      prisma.shipment.findMany({
        where: shipmentWhereForActor(actor),
        include: shipmentInclude,
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 120,
      }),
      prisma.order.findMany({
        where: {
          status: "paid",
          shipments: { none: { status: { notIn: ["failed", "returned", "cancelled"] } } },
          ...(canManage ? {} : { sellerId: actor.id }),
        },
        include: orderInclude,
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.barterProposal.findMany({
        where: {
          status: { in: ["accepted", "both_shipped"] },
          ...(canManage ? {} : { OR: [{ initiatorId: actor.id }, { recipientId: actor.id }] }),
        },
        include: barterProposalInclude,
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      shipments: shipments.map(presentShipment),
      eligibleOrders,
      eligibleBarters,
    };
  }

  async createOrderShipment(input: CreateOrderShipmentInput) {
    return prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: input.actorId },
        select: { id: true, role: true },
      });
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { shipments: true },
      });

      assertMarketplace(actor, "user_not_found", "User account was not found.", 404);
      assertMarketplace(order, "order_not_found", "Order was not found.", 404);
      assertMarketplace(
        canManageMarketplace(actor.role) || order.sellerId === actor.id,
        "forbidden",
        "Only the seller or support can create this shipment.",
        403,
      );
      assertMarketplace(
        order.status === "paid",
        "invalid_order_state",
        "Only paid orders can be shipped.",
        409,
      );
      assertMarketplace(
        !order.shipments.some((shipment) => !isShipmentException(shipment.status)),
        "shipment_exists",
        "This order already has an active shipment.",
        409,
      );

      const duplicateTracking = await tx.shipment.findFirst({
        where: { courier: input.courier, trackingNumber: input.trackingNumber },
        select: { id: true },
      });
      assertMarketplace(
        !duplicateTracking,
        "tracking_exists",
        "Tracking number is already in use.",
        409,
      );

      const now = new Date();
      const events = appendShipmentEvent([], {
        status: "in_transit",
        at: now.toISOString(),
        source: eventSource(actor),
        note: "Shipment created for paid order.",
        location: cleanOptionalText(input.hubCode),
      });
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          shipperId: order.sellerId,
          recipientId: order.buyerId,
          courier: input.courier,
          trackingNumber: input.trackingNumber,
          labelUrl: input.labelUrl,
          hubCode: input.hubCode,
          insuredValueNgn: input.insuredValueNgn,
          status: "in_transit",
          events: events as Prisma.InputJsonArray,
        },
      });
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "shipped", shippedAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "logistics.order_shipment_created",
          entity: "Shipment",
          entityId: shipment.id,
          beforeState: { orderStatus: order.status },
          afterState: {
            orderStatus: updatedOrder.status,
            shipmentStatus: shipment.status,
            courier: shipment.courier,
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: order.buyerId,
          type: "order",
          title: "Shipment in transit",
          body: "Your BD Select order has been handed to logistics with tracking.",
          actionUrl: "/logistics",
          metadata: { orderId: order.id, shipmentId: shipment.id },
        },
      ]);

      return { shipment, order: updatedOrder };
    });
  }

  async createBarterShipment(input: CreateBarterShipmentInput) {
    return prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: input.actorId },
        select: { id: true, role: true },
      });
      const proposal = await tx.barterProposal.findUnique({
        where: { id: input.proposalId },
        include: { shipments: true },
      });

      assertMarketplace(actor, "user_not_found", "User account was not found.", 404);
      assertMarketplace(proposal, "proposal_not_found", "Barter proposal was not found.", 404);
      assertMarketplace(
        proposal.status === "accepted" || proposal.status === "both_shipped",
        "invalid_barter_state",
        "Only accepted barter proposals can create shipments.",
        409,
      );

      const actorIsParticipant =
        proposal.initiatorId === actor.id || proposal.recipientId === actor.id;
      assertMarketplace(
        canManageMarketplace(actor.role) || actorIsParticipant,
        "forbidden",
        "Only a barter participant or support can create this shipment.",
        403,
      );

      const shipperId = canManageMarketplace(actor.role)
        ? proposal.shipments.some((shipment) => shipment.shipperId === proposal.initiatorId)
          ? proposal.recipientId
          : proposal.initiatorId
        : actor.id;
      const recipientId =
        shipperId === proposal.initiatorId ? proposal.recipientId : proposal.initiatorId;

      assertMarketplace(
        !proposal.shipments.some(
          (shipment) => shipment.shipperId === shipperId && !isShipmentException(shipment.status),
        ),
        "shipment_exists",
        "This barter side already has an active shipment.",
        409,
      );

      const duplicateTracking = await tx.shipment.findFirst({
        where: { courier: input.courier, trackingNumber: input.trackingNumber },
        select: { id: true },
      });
      assertMarketplace(
        !duplicateTracking,
        "tracking_exists",
        "Tracking number is already in use.",
        409,
      );

      const now = new Date();
      const events = appendShipmentEvent([], {
        status: "in_transit",
        at: now.toISOString(),
        source: eventSource(actor),
        note: "Shipment created for accepted barter proposal.",
        location: cleanOptionalText(input.hubCode),
      });
      const shipment = await tx.shipment.create({
        data: {
          barterProposalId: proposal.id,
          shipperId,
          recipientId,
          courier: input.courier,
          trackingNumber: input.trackingNumber,
          labelUrl: input.labelUrl,
          hubCode: input.hubCode,
          insuredValueNgn: input.insuredValueNgn,
          status: "in_transit",
          events: events as Prisma.InputJsonArray,
        },
      });
      const statuses = [...proposal.shipments.map((item) => item.status), shipment.status];
      const nextStatus = barterStatusAfterShipment(statuses, proposal.status);
      const updatedProposal = await tx.barterProposal.update({
        where: { id: proposal.id },
        data: { status: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "logistics.barter_shipment_created",
          entity: "Shipment",
          entityId: shipment.id,
          beforeState: { barterStatus: proposal.status },
          afterState: {
            barterStatus: updatedProposal.status,
            shipmentStatus: shipment.status,
            courier: shipment.courier,
            shipperId,
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: recipientId,
          type: "barter",
          title: "Barter shipment in transit",
          body: "A barter participant created shipment tracking for their swap item.",
          actionUrl: "/logistics",
          metadata: { barterProposalId: proposal.id, shipmentId: shipment.id },
        },
      ]);

      return { shipment, proposal: updatedProposal };
    });
  }

  async recordShipmentEvent(input: RecordShipmentEventInput) {
    return prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: input.actorId },
        select: { id: true, role: true },
      });
      const shipment = await tx.shipment.findUnique({
        where: { id: input.shipmentId },
        include: shipmentInclude,
      });

      assertMarketplace(actor, "user_not_found", "User account was not found.", 404);
      assertMarketplace(shipment, "shipment_not_found", "Shipment was not found.", 404);
      assertCanAccessShipment(actor, shipment);
      assertMarketplace(
        canManageMarketplace(actor.role) || shipment.shipperId === actor.id,
        "forbidden",
        "Only the shipper or support can update shipment events.",
        403,
      );

      const now = new Date();
      const events = appendShipmentEvent(shipment.events, {
        status: input.status,
        at: now.toISOString(),
        source: eventSource(actor),
        note: cleanOptionalText(input.note),
        location: cleanOptionalText(input.location),
      });
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: input.status,
          deliveredAt:
            input.status === "delivered" ? (shipment.deliveredAt ?? now) : shipment.deliveredAt,
          events: events as Prisma.InputJsonArray,
        },
      });

      let updatedOrder = null;
      if (shipment.order && input.status === "delivered" && shipment.order.status === "shipped") {
        updatedOrder = await tx.order.update({
          where: { id: shipment.order.id },
          data: { status: "delivered", deliveredAt: shipment.order.deliveredAt ?? now },
        });
      }

      let updatedProposal = null;
      if (shipment.barterProposal) {
        const proposalShipments = await tx.shipment.findMany({
          where: { barterProposalId: shipment.barterProposal.id },
          select: { id: true, status: true },
        });
        const statuses = proposalShipments.map((item) =>
          item.id === shipment.id ? input.status : item.status,
        );
        const nextStatus = barterStatusAfterShipment(statuses, shipment.barterProposal.status);
        if (nextStatus !== shipment.barterProposal.status) {
          updatedProposal = await tx.barterProposal.update({
            where: { id: shipment.barterProposal.id },
            data: { status: nextStatus },
          });
        }
      }

      const recipientIds = new Set<string>();
      if (shipment.order) {
        recipientIds.add(shipment.order.buyerId);
        recipientIds.add(shipment.order.sellerId);
      }
      if (shipment.barterProposal) {
        recipientIds.add(shipment.barterProposal.initiatorId);
        recipientIds.add(shipment.barterProposal.recipientId);
      }
      recipientIds.delete(actor.id);

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "logistics.shipment_event_recorded",
          entity: "Shipment",
          entityId: shipment.id,
          beforeState: {
            shipmentStatus: shipment.status,
            orderStatus: shipment.order?.status,
            barterStatus: shipment.barterProposal?.status,
          },
          afterState: {
            shipmentStatus: updatedShipment.status,
            orderStatus: updatedOrder?.status,
            barterStatus: updatedProposal?.status,
            risk: shipmentRisk(updatedShipment.status, updatedShipment.updatedAt),
          },
        },
      });

      await createMarketplaceNotifications(
        tx,
        [...recipientIds].map((userId) => ({
          userId,
          type: shipment.barterProposal ? "barter" : "order",
          title: isShipmentException(input.status) ? "Shipment exception" : "Shipment updated",
          body: `Shipment status is now ${input.status.replaceAll("_", " ")}.`,
          actionUrl: "/logistics",
          metadata: {
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            barterProposalId: shipment.barterProposalId,
            status: input.status,
          },
        })),
      );

      return {
        shipment: updatedShipment,
        order: updatedOrder,
        barterProposal: updatedProposal,
      };
    });
  }
}
