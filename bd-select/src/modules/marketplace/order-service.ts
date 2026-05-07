import type { DisputeReason, PaymentChannel, PaymentProcessor, Prisma, ShipmentCourier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { addDays, addHours, DISPUTE_WINDOW_DAYS } from "@/modules/marketplace/constants";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";
import { calculateOrderQuote } from "@/modules/marketplace/pricing";

export type CreateOrderInput = {
  buyerId: string;
  listingId: string;
  shippingFeeNgn?: number;
};

export type OpenDisputeInput = {
  actorId: string;
  orderId: string;
  reasonCode: DisputeReason;
  evidence?: Prisma.InputJsonObject;
};

export type PayOrderInput = {
  actorId: string;
  orderId: string;
  processor: PaymentProcessor;
  channel: PaymentChannel;
  reference?: string;
};

export type ShipOrderInput = {
  actorId: string;
  orderId: string;
  courier: ShipmentCourier;
  trackingNumber: string;
  labelUrl?: string;
  hubCode?: string;
  insuredValueNgn?: number;
};

export type CreateReviewInput = {
  actorId: string;
  orderId: string;
  targetId: string;
  stars: number;
  body?: string;
};

function processorReference(orderId: string, processor: PaymentProcessor) {
  return `${processor}_${orderId}_${Date.now()}`;
}

export class OrderService {
  async listForUser(userId: string) {
    return prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        listing: {
          include: {
            brand: true,
            category: true,
            photos: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true, sellerScore: true } },
        payments: { orderBy: { createdAt: "desc" } },
        shipments: { orderBy: { createdAt: "desc" } },
        disputes: { orderBy: { createdAt: "desc" } },
        reviews: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createOrder(input: CreateOrderInput) {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: input.listingId },
        include: { seller: { include: { sellerProfile: true } } },
      });

      assertMarketplace(listing, "listing_not_found", "Listing was not found.", 404);
      assertMarketplace(listing.status === "live", "listing_unavailable", "Listing is not available for purchase.", 409);
      assertMarketplace(listing.sellerId !== input.buyerId, "invalid_order", "Buyers cannot purchase their own listings.", 409);

      const quote = calculateOrderQuote(listing.priceNgn, input.shippingFeeNgn ?? 0);

      const order = await tx.order.create({
        data: {
          buyerId: input.buyerId,
          sellerId: listing.sellerId,
          listingId: listing.id,
          grossNgn: quote.grossNgn,
          buyerFeeNgn: quote.buyerFeeNgn,
          sellerFeeNgn: quote.sellerFeeNgn,
          authenticationFeeNgn: quote.authenticationFeeNgn,
          paymentFeeNgn: quote.paymentFeeNgn,
          shippingFeeNgn: quote.shippingFeeNgn,
          payoutNgn: quote.payoutNgn,
          status: "pending_payment",
          escrowState: "collecting",
          metadata: {
            buyerTotalNgn: quote.buyerTotalNgn,
            payoutBlockedUntilPayment: true,
          },
        },
      });

      await tx.listing.update({
        where: { id: listing.id },
        data: { status: "reserved" },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.buyerId,
          action: "order.created",
          entity: "Order",
          entityId: order.id,
          afterState: {
            status: order.status,
            escrowState: order.escrowState,
            listingStatus: "reserved",
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: listing.sellerId,
          type: "order",
          title: "Listing reserved",
          body: "A buyer started checkout. The listing is reserved while payment is pending.",
          actionUrl: "/orders",
          metadata: { orderId: order.id, listingId: listing.id },
        },
      ]);

      return { order, quote };
    });
  }

  async payOrder(input: PayOrderInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: input.orderId } });

      assertMarketplace(order, "order_not_found", "Order was not found.", 404);
      assertMarketplace(order.buyerId === input.actorId, "forbidden", "Only the buyer can pay for this order.", 403);
      assertMarketplace(order.status === "pending_payment", "invalid_order_state", "Only pending-payment orders can be paid.", 409);

      const buyerTotalNgn = order.grossNgn + order.buyerFeeNgn + order.shippingFeeNgn;
      const now = new Date();
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          processor: input.processor,
          reference: input.reference ?? processorReference(order.id, input.processor),
          amountNgn: buyerTotalNgn,
          status: "paid",
          channel: input.channel,
          paidAt: now,
          metadata: {
            mode: input.processor === "manual" ? "local_development" : "processor_stub",
          },
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "paid",
          escrowState: "held",
          paidAt: now,
          autoConfirmAt: addHours(now, 72),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "order.payment_recorded",
          entity: "Payment",
          entityId: payment.id,
          beforeState: { orderStatus: order.status, escrowState: order.escrowState },
          afterState: { orderStatus: updatedOrder.status, escrowState: updatedOrder.escrowState },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: order.sellerId,
          type: "order",
          title: "Payment received",
          body: "Escrow is held. Create shipment when the item is ready for handoff.",
          actionUrl: "/orders",
          metadata: { orderId: order.id, paymentId: payment.id },
        },
      ]);

      return { order: updatedOrder, payment };
    });
  }

  async shipOrder(input: ShipOrderInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: input.orderId } });

      assertMarketplace(order, "order_not_found", "Order was not found.", 404);
      assertMarketplace(order.sellerId === input.actorId, "forbidden", "Only the seller can ship this order.", 403);
      assertMarketplace(order.status === "paid", "invalid_order_state", "Only paid orders can be shipped.", 409);

      const now = new Date();
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
          events: [{ status: "in_transit", at: now.toISOString() }],
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "shipped", shippedAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "order.shipped",
          entity: "Shipment",
          entityId: shipment.id,
          beforeState: { orderStatus: order.status },
          afterState: { orderStatus: updatedOrder.status, courier: shipment.courier },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: order.buyerId,
          type: "order",
          title: "Order shipped",
          body: "The seller created shipment tracking for your BD Select order.",
          actionUrl: "/orders",
          metadata: { orderId: order.id, shipmentId: shipment.id },
        },
      ]);

      return { order: updatedOrder, shipment };
    });
  }

  async confirmDelivery(buyerId: string, orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { seller: { include: { sellerProfile: true } } },
      });

      assertMarketplace(order, "order_not_found", "Order was not found.", 404);
      assertMarketplace(order.buyerId === buyerId, "forbidden", "Only the buyer can confirm delivery.", 403);
      assertMarketplace(
        ["paid", "shipped", "delivered"].includes(order.status),
        "invalid_order_state",
        "Only paid, shipped, or delivered orders can be confirmed.",
        409,
      );

      const now = new Date();
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "completed",
          escrowState: "release_pending",
          deliveredAt: order.deliveredAt ?? now,
          completedAt: now,
          autoConfirmAt: order.autoConfirmAt ?? addHours(now, 72),
        },
      });

      if (order.seller.sellerProfile?.payoutToken) {
        await tx.payout.upsert({
          where: { orderId: order.id },
          create: {
            sellerId: order.sellerId,
            orderId: order.id,
            bankAccountToken: order.seller.sellerProfile.payoutToken,
            amountNgn: order.payoutNgn,
            status: "queued",
          },
          update: {
            bankAccountToken: order.seller.sellerProfile.payoutToken,
            amountNgn: order.payoutNgn,
            status: "queued",
          },
        });
      }

      await tx.listing.update({
        where: { id: order.listingId },
        data: { status: "sold", soldAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorId: buyerId,
          action: "order.delivery_confirmed",
          entity: "Order",
          entityId: order.id,
          beforeState: { status: order.status, escrowState: order.escrowState },
          afterState: { status: updatedOrder.status, escrowState: updatedOrder.escrowState },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: order.sellerId,
          type: "payout",
          title: "Delivery confirmed",
          body: "The order is completed and payout release has been queued for finance operations.",
          actionUrl: "/orders",
          metadata: { orderId: order.id },
        },
      ]);

      return updatedOrder;
    });
  }

  async openDispute(input: OpenDisputeInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: input.orderId } });

      assertMarketplace(order, "order_not_found", "Order was not found.", 404);
      assertMarketplace(
        order.buyerId === input.actorId || order.sellerId === input.actorId,
        "forbidden",
        "Only the buyer or seller can dispute this order.",
        403,
      );
      assertMarketplace(order.status !== "refunded", "invalid_order_state", "Refunded orders cannot be disputed.", 409);

      if (order.deliveredAt) {
        assertMarketplace(
          Date.now() <= addDays(order.deliveredAt, DISPUTE_WINDOW_DAYS).getTime(),
          "dispute_window_closed",
          "The dispute window has closed.",
          409,
        );
      }

      const dispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          raisedById: input.actorId,
          reasonCode: input.reasonCode,
          evidence: input.evidence,
          status: "open",
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "disputed", escrowState: "held" },
      });

      const admins = await tx.user.findMany({
        where: { role: { in: ["admin", "super_admin"] } },
        select: { id: true },
      });
      const counterpartyId = order.buyerId === input.actorId ? order.sellerId : order.buyerId;

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "order.dispute_opened",
          entity: "Dispute",
          entityId: dispute.id,
          beforeState: { orderStatus: order.status, escrowState: order.escrowState },
          afterState: { orderStatus: updatedOrder.status, escrowState: updatedOrder.escrowState },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: counterpartyId,
          type: "dispute",
          title: "Order dispute opened",
          body: "Escrow is held while BD Select support reviews the order dispute.",
          actionUrl: "/orders",
          metadata: { orderId: order.id, disputeId: dispute.id },
        },
        ...admins.map((admin) => ({
          userId: admin.id,
          type: "dispute" as const,
          title: "Dispute needs review",
          body: "A new order dispute is waiting in the trust desk.",
          actionUrl: "/admin",
          metadata: { orderId: order.id, disputeId: dispute.id },
        })),
      ]);

      return { dispute, order: updatedOrder };
    });
  }

  async createReview(input: CreateReviewInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: input.orderId } });

      assertMarketplace(order, "order_not_found", "Order was not found.", 404);
      assertMarketplace(order.status === "completed", "invalid_order_state", "Only completed orders can be reviewed.", 409);
      assertMarketplace(
        order.buyerId === input.actorId || order.sellerId === input.actorId,
        "forbidden",
        "Only order participants can review.",
        403,
      );
      assertMarketplace(
        input.targetId === order.buyerId || input.targetId === order.sellerId,
        "invalid_review_target",
        "Review target must be the buyer or seller.",
        422,
      );
      assertMarketplace(input.targetId !== input.actorId, "invalid_review_target", "Users cannot review themselves.", 422);

      const review = await tx.review.create({
        data: {
          orderId: order.id,
          authorId: input.actorId,
          targetId: input.targetId,
          stars: input.stars,
          body: input.body,
        },
      });

      if (input.targetId === order.sellerId) {
        const aggregate = await tx.review.aggregate({
          where: { targetId: order.sellerId },
          _avg: { stars: true },
        });

        await tx.user.update({
          where: { id: order.sellerId },
          data: { sellerScore: aggregate._avg.stars ?? 0 },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "order.review_created",
          entity: "Review",
          entityId: review.id,
          afterState: { stars: review.stars, targetId: review.targetId },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: input.targetId,
          type: "review",
          title: "New transaction review",
          body: "A BD Select order participant left a review after completion.",
          actionUrl: "/orders",
          metadata: { orderId: order.id, reviewId: review.id, stars: review.stars },
        },
      ]);

      return review;
    });
  }
}
