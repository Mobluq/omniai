import { prisma } from "@/lib/db/prisma";
import { canManageMarketplace } from "@/modules/identity/role-policy";
import {
  planDisputeResolution,
  type DisputeResolutionDecision,
} from "@/modules/marketplace/dispute-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";
import {
  planPayoutTransition,
  type PayoutStatusName,
  type PayoutTransitionAction,
} from "@/modules/marketplace/payout-policy";

export type ResolveDisputeInput = {
  adminId: string;
  disputeId: string;
  decision: DisputeResolutionDecision;
  resolution: string;
  sellerPayoutNgn?: number;
  releasePayout?: boolean;
};

export type TransitionPayoutInput = {
  adminId: string;
  payoutId: string;
  action: PayoutTransitionAction;
  processorReference?: string;
  note?: string;
};

const activeDisputeStatuses = ["open", "under_review", "awaiting_evidence"] as const;
const payoutStatuses = ["pending", "queued", "processing", "paid", "failed", "cancelled"] as const;

function isActiveDisputeStatus(status: string) {
  return activeDisputeStatuses.some((activeStatus) => activeStatus === status);
}

function isPayoutStatusName(status: string): status is PayoutStatusName {
  return payoutStatuses.some((payoutStatus) => payoutStatus === status);
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safePayoutToken(token: string) {
  return token.length <= 4 ? token : token.slice(-4);
}

function presentPayout<T extends { bankAccountToken: string }>(payout: T) {
  const { bankAccountToken: _bankAccountToken, ...safePayout } = payout;
  return {
    ...safePayout,
    bankAccountTokenLast4: safePayoutToken(_bankAccountToken),
  };
}

export class OperationsService {
  async listDisputes(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    assertMarketplace(admin, "admin_not_found", "Admin account was not found.", 404);
    assertMarketplace(canManageMarketplace(admin.role), "forbidden", "Admin role is required.", 403);

    return prisma.dispute.findMany({
      where: { status: { in: [...activeDisputeStatuses] } },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        order: {
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
            reviews: { orderBy: { createdAt: "desc" } },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
      take: 100,
    });
  }

  async resolveDispute(input: ResolveDisputeInput) {
    return prisma.$transaction(async (tx) => {
      const admin = await tx.user.findUnique({
        where: { id: input.adminId },
        select: { id: true, role: true },
      });

      assertMarketplace(admin, "admin_not_found", "Admin account was not found.", 404);
      assertMarketplace(canManageMarketplace(admin.role), "forbidden", "Admin role is required.", 403);

      const dispute = await tx.dispute.findUnique({
        where: { id: input.disputeId },
        include: {
          order: {
            include: {
              seller: { include: { sellerProfile: true } },
              listing: { select: { id: true, status: true, soldAt: true } },
            },
          },
        },
      });

      assertMarketplace(dispute, "dispute_not_found", "Dispute was not found.", 404);
      assertMarketplace(
        isActiveDisputeStatus(dispute.status),
        "invalid_dispute_state",
        "Only active disputes can be resolved.",
        409,
      );

      const plan = planDisputeResolution(input.decision);
      const now = new Date();
      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: plan.disputeStatus,
          resolution: input.resolution,
          resolvedById: input.adminId,
          resolvedAt: now,
        },
      });

      let updatedOrder = null;
      let payout = null;

      if (dispute.order) {
        updatedOrder = await tx.order.update({
          where: { id: dispute.order.id },
          data: {
            status: plan.orderStatus,
            escrowState: plan.escrowState,
            completedAt: plan.orderStatus === "completed" ? (dispute.order.completedAt ?? now) : dispute.order.completedAt,
          },
        });

        await tx.listing.update({
          where: { id: dispute.order.listingId },
          data: {
            status: plan.listingStatus,
            soldAt: plan.listingStatus === "sold" ? (dispute.order.listing.soldAt ?? now) : null,
          },
        });

        const shouldReleasePayout = input.releasePayout ?? plan.defaultReleasePayout;
        const payoutAmountNgn = Math.min(input.sellerPayoutNgn ?? dispute.order.payoutNgn, dispute.order.payoutNgn);

        if (shouldReleasePayout && payoutAmountNgn > 0 && dispute.order.seller.sellerProfile?.payoutToken) {
          payout = await tx.payout.upsert({
            where: { orderId: dispute.order.id },
            create: {
              sellerId: dispute.order.sellerId,
              orderId: dispute.order.id,
              bankAccountToken: dispute.order.seller.sellerProfile.payoutToken,
              amountNgn: payoutAmountNgn,
              status: "queued",
              metadata: {
                source: "dispute_resolution",
                decision: input.decision,
                originalPayoutNgn: dispute.order.payoutNgn,
              },
            },
            update: {
              bankAccountToken: dispute.order.seller.sellerProfile.payoutToken,
              amountNgn: payoutAmountNgn,
              status: "queued",
              metadata: {
                source: "dispute_resolution",
                decision: input.decision,
                originalPayoutNgn: dispute.order.payoutNgn,
              },
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "dispute.resolved",
          entity: "Dispute",
          entityId: dispute.id,
          beforeState: { disputeStatus: dispute.status, orderStatus: dispute.order?.status },
          afterState: {
            disputeStatus: updatedDispute.status,
            orderStatus: updatedOrder?.status,
            escrowState: updatedOrder?.escrowState,
            decision: input.decision,
            payoutId: payout?.id,
          },
        },
      });

      if (dispute.order) {
        await createMarketplaceNotifications(tx, [
          {
            userId: dispute.order.buyerId,
            type: "dispute",
            title: "Dispute resolved",
            body: "BD Select support resolved the order dispute. Review the final order state in your order center.",
            actionUrl: "/orders",
            metadata: {
              disputeId: dispute.id,
              orderId: dispute.order.id,
              decision: input.decision,
            },
          },
          {
            userId: dispute.order.sellerId,
            type: "dispute",
            title: "Dispute resolved",
            body: "BD Select support resolved the order dispute. Review the final order state in your order center.",
            actionUrl: "/orders",
            metadata: {
              disputeId: dispute.id,
              orderId: dispute.order.id,
              decision: input.decision,
              payoutId: payout?.id,
            },
          },
          ...(payout
            ? [
                {
                  userId: dispute.order.sellerId,
                  type: "payout" as const,
                  title: "Payout queued",
                  body: "A dispute resolution queued a seller payout for finance processing.",
                  actionUrl: "/orders",
                  metadata: { disputeId: dispute.id, orderId: dispute.order.id, payoutId: payout.id },
                },
              ]
            : []),
        ]);
      }

      return { dispute: updatedDispute, order: updatedOrder, payout };
    });
  }

  async listPayouts(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    assertMarketplace(admin, "admin_not_found", "Admin account was not found.", 404);
    assertMarketplace(canManageMarketplace(admin.role), "forbidden", "Admin role is required.", 403);

    const payouts = await prisma.payout.findMany({
      where: { status: { in: ["pending", "queued", "processing", "failed"] } },
      include: {
        seller: { select: { id: true, name: true, email: true, sellerScore: true } },
        order: {
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
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 100,
    });

    return payouts.map(presentPayout);
  }

  async transitionPayout(input: TransitionPayoutInput) {
    return prisma.$transaction(async (tx) => {
      const admin = await tx.user.findUnique({
        where: { id: input.adminId },
        select: { id: true, role: true },
      });

      assertMarketplace(admin, "admin_not_found", "Admin account was not found.", 404);
      assertMarketplace(canManageMarketplace(admin.role), "forbidden", "Admin role is required.", 403);

      const payout = await tx.payout.findUnique({
        where: { id: input.payoutId },
        include: { order: true },
      });

      assertMarketplace(payout, "payout_not_found", "Payout was not found.", 404);
      assertMarketplace(
        isPayoutStatusName(payout.status),
        "invalid_payout_state",
        "Payout has an unsupported status.",
        409,
      );

      const transition = planPayoutTransition(payout.status, input.action);
      if (!transition.allowed) {
        assertMarketplace(false, "invalid_payout_transition", transition.reason, 409);
      }

      const now = new Date();
      const releasedAt =
        transition.releasedAtMode === "set"
          ? now
          : transition.releasedAtMode === "clear"
            ? null
            : payout.releasedAt;

      const processorReference =
        input.action === "mark_paid"
          ? (input.processorReference?.trim() || `manual_${payout.id}`)
          : (input.processorReference?.trim() || payout.processorReference);

      const updatedPayout = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: transition.nextStatus,
          processorReference,
          releasedAt,
          metadata: {
            ...metadataRecord(payout.metadata),
            lastTransition: {
              action: input.action,
              note: input.note,
              actorId: input.adminId,
              at: now.toISOString(),
            },
          },
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payout.orderId },
        data: { escrowState: transition.orderEscrowState },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "payout.transitioned",
          entity: "Payout",
          entityId: payout.id,
          beforeState: { payoutStatus: payout.status, orderEscrowState: payout.order.escrowState },
          afterState: {
            payoutStatus: updatedPayout.status,
            orderEscrowState: updatedOrder.escrowState,
            processorReference: updatedPayout.processorReference,
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: payout.sellerId,
          type: "payout",
          title: "Payout updated",
          body: `Your seller payout is now ${updatedPayout.status}.`,
          actionUrl: "/orders",
          metadata: {
            payoutId: payout.id,
            orderId: payout.orderId,
            status: updatedPayout.status,
          },
        },
      ]);

      return { payout: presentPayout(updatedPayout), order: updatedOrder };
    });
  }
}
