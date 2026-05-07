import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canManageMarketplace } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";
import {
  makeRiskCase,
  riskCaseKind,
  type RiskAction,
  type RiskCase,
  type RiskCategory,
  type RiskSeverity,
  type RiskSignal,
} from "@/modules/marketplace/risk-policy";
import { shipmentRisk } from "@/modules/marketplace/shipping-policy";

export type ListRiskCasesInput = {
  adminId: string;
  category?: RiskCategory;
  severity?: RiskSeverity;
};

export type ApplyRiskActionInput = {
  adminId: string;
  caseId: string;
  action: RiskAction;
  note?: string;
};

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function shortMoney(value: number) {
  return `NGN ${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value)}`;
}

function evidenceFileCount(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const files = (value as Record<string, unknown>).files;
  return Array.isArray(files) ? files.length : 0;
}

function signal(label: string, detail: string, weight: number): RiskSignal {
  return { label, detail, weight };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export class RiskService {
  private async assertAdmin(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });

    assertMarketplace(admin, "admin_not_found", "Admin account was not found.", 404);
    assertMarketplace(
      canManageMarketplace(admin.role),
      "forbidden",
      "Admin role is required.",
      403,
    );
    return admin;
  }

  async listCases(input: ListRiskCasesInput) {
    await this.assertAdmin(input.adminId);

    const [listingCases, messageCases, disputeCases, shipmentCases, userCases] = await Promise.all([
      this.listListingCases(),
      this.listMessageCases(),
      this.listDisputeCases(),
      this.listShipmentCases(),
      this.listUserCases(),
    ]);

    const cases = [
      ...listingCases,
      ...messageCases,
      ...disputeCases,
      ...shipmentCases,
      ...userCases,
    ]
      .filter((item) => !input.category || item.category === input.category)
      .filter((item) => !input.severity || item.severity === input.severity)
      .sort(
        (left, right) => right.score - left.score || right.updatedAt.localeCompare(left.updatedAt),
      )
      .slice(0, 150);

    return {
      cases,
      stats: {
        total: cases.length,
        critical: cases.filter((item) => item.severity === "critical").length,
        high: cases.filter((item) => item.severity === "high").length,
        medium: cases.filter((item) => item.severity === "medium").length,
        open: cases.filter((item) => item.status === "open").length,
      },
      facets: {
        categories: riskCategoryCounts(cases),
        severities: riskSeverityCounts(cases),
      },
    };
  }

  private async listListingCases(): Promise<RiskCase[]> {
    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { status: { in: ["in_review", "needs_more_info", "rejected"] } },
          { aiAuthenticityScore: { lt: 72 } },
          { priceNgn: { gte: 250_000 } },
          { brand: { is: { restricted: true } } },
        ],
      },
      include: {
        brand: true,
        category: true,
        seller: { select: { id: true, name: true, email: true, role: true, sellerScore: true } },
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    });

    return listings
      .map((listing) => {
        const signals: RiskSignal[] = [];
        if (listing.brand?.restricted) {
          signals.push(
            signal("Restricted brand", `${listing.brand.name} requires closer authentication.`, 30),
          );
        }
        if ((listing.aiAuthenticityScore ?? 100) < 72) {
          signals.push(
            signal(
              "Low authenticity signal",
              `AI authenticity score is ${listing.aiAuthenticityScore}/100.`,
              30,
            ),
          );
        }
        if (listing.priceNgn >= 250_000) {
          signals.push(signal("High value", `${shortMoney(listing.priceNgn)} listing value.`, 20));
        }
        if (listing.status === "rejected") {
          signals.push(
            signal("Rejected listing", "Listing was already rejected by authentication.", 25),
          );
        }
        if (listing.status === "needs_more_info") {
          signals.push(
            signal("Needs more info", "Seller has an incomplete authentication request.", 15),
          );
        }

        if (signals.length === 0) return null;

        return makeRiskCase({
          id: `listing:${listing.id}`,
          entity: "Listing",
          entityId: listing.id,
          category: "listing",
          title: listing.title,
          summary: `${listing.seller.email ?? listing.seller.name ?? "Seller"} / ${listing.status}`,
          href: "/admin",
          status: listing.status === "in_review" ? "open" : "reviewed",
          recommendedAction: "escalate",
          signals,
          actor: listing.seller,
          createdAt: iso(listing.createdAt),
          updatedAt: iso(listing.updatedAt),
        });
      })
      .filter((item): item is RiskCase => Boolean(item));
  }

  private async listMessageCases(): Promise<RiskCase[]> {
    const messages = await prisma.message.findMany({
      where: { redactions: { not: Prisma.JsonNull } },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        thread: {
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, email: true, role: true } } },
            },
            order: { include: { listing: true } },
            barterProposal: { include: { targetListing: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    const byThread = new Map<string, typeof messages>();
    for (const message of messages) {
      byThread.set(message.threadId, [...(byThread.get(message.threadId) ?? []), message]);
    }

    return [...byThread.entries()].map(([threadId, threadMessages]) => {
      const latest = threadMessages[0];
      const thread = latest.thread;
      const signals = [
        signal(
          "Contact redaction",
          `${threadMessages.length} message(s) contained off-platform contact patterns.`,
          45,
        ),
      ];
      if (threadMessages.length >= 2) {
        signals.push(
          signal("Repeated attempt", "Multiple redacted messages in one conversation.", 25),
        );
      }
      if (thread.order?.listing.priceNgn && thread.order.listing.priceNgn >= 150_000) {
        signals.push(
          signal(
            "Transaction value",
            `${shortMoney(thread.order.listing.priceNgn)} order context.`,
            15,
          ),
        );
      }

      return makeRiskCase({
        id: `message-thread:${threadId}`,
        entity: "MessageThread",
        entityId: threadId,
        category: "messaging",
        title:
          thread.order?.listing.title ??
          thread.barterProposal?.targetListing.title ??
          "Protected message thread",
        summary: `Latest sender: ${latest.sender.email ?? latest.sender.name ?? latest.senderId}`,
        href: "/inbox",
        status: thread.status === "locked" ? "reviewed" : "open",
        recommendedAction: "escalate",
        signals,
        actor: latest.sender,
        createdAt: iso(thread.createdAt),
        updatedAt: iso(thread.updatedAt),
      });
    });
  }

  private async listDisputeCases(): Promise<RiskCase[]> {
    const disputes = await prisma.dispute.findMany({
      where: { status: { in: ["open", "under_review", "awaiting_evidence"] } },
      include: {
        raisedBy: { select: { id: true, name: true, email: true, role: true } },
        order: { include: { listing: true, buyer: true, seller: true, shipments: true } },
        barterProposal: { include: { targetListing: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    });

    return disputes.map((dispute) => {
      const signals = [
        signal(
          "Active dispute",
          `${dispute.reasonCode.replaceAll("_", " ")} / ${dispute.status}.`,
          35,
        ),
      ];
      const files = evidenceFileCount(dispute.evidence);
      if (files === 0)
        signals.push(
          signal("No evidence files", "Case has no structured evidence attachments.", 25),
        );
      if (files >= 2)
        signals.push(signal("Evidence density", `${files} evidence files attached.`, 15));
      if ((dispute.order?.grossNgn ?? 0) >= 150_000) {
        signals.push(
          signal(
            "Escrow exposure",
            `${shortMoney(dispute.order?.grossNgn ?? 0)} disputed value.`,
            20,
          ),
        );
      }
      if (
        dispute.order?.shipments.some((shipment) =>
          ["failed", "returned"].includes(shipment.status),
        )
      ) {
        signals.push(
          signal("Shipment exception", "Order has failed or returned shipment history.", 25),
        );
      }

      return makeRiskCase({
        id: `dispute:${dispute.id}`,
        entity: "Dispute",
        entityId: dispute.id,
        category: "dispute",
        title:
          dispute.order?.listing.title ??
          dispute.barterProposal?.targetListing.title ??
          "Dispute case",
        summary: `Raised by ${dispute.raisedBy.email ?? dispute.raisedBy.name ?? dispute.raisedById}`,
        href: "/evidence",
        status: "open",
        recommendedAction: "escalate",
        signals,
        actor: dispute.raisedBy,
        createdAt: iso(dispute.createdAt),
        updatedAt: iso(dispute.updatedAt),
      });
    });
  }

  private async listShipmentCases(): Promise<RiskCase[]> {
    const shipments = await prisma.shipment.findMany({
      where: { status: { in: ["in_transit", "failed", "returned", "cancelled"] } },
      include: {
        shipper: { select: { id: true, name: true, email: true, role: true } },
        order: { include: { listing: true } },
        barterProposal: { include: { targetListing: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    });

    return shipments
      .map((shipment) => {
        const risk = shipmentRisk(shipment.status, shipment.updatedAt);
        const signals: RiskSignal[] = [];
        if (risk === "exception") {
          signals.push(signal("Carrier exception", `Shipment status is ${shipment.status}.`, 55));
        }
        if (risk === "stale") {
          signals.push(
            signal("Stale tracking", "Shipment has been in transit for more than five days.", 35),
          );
        }
        if (shipment.insuredValueNgn && shipment.insuredValueNgn >= 150_000) {
          signals.push(
            signal(
              "Insured value",
              `${shortMoney(shipment.insuredValueNgn)} insured shipment.`,
              20,
            ),
          );
        }
        if (shipment.barterProposalId) {
          signals.push(
            signal("Barter logistics", "Swap release depends on dual delivery review.", 15),
          );
        }

        if (signals.length === 0) return null;

        return makeRiskCase({
          id: `shipment:${shipment.id}`,
          entity: "Shipment",
          entityId: shipment.id,
          category: "logistics",
          title:
            shipment.order?.listing.title ??
            shipment.barterProposal?.targetListing.title ??
            "Shipment",
          summary: `${shipment.courier} / ${shipment.trackingNumber ?? "No tracking"} / ${shipment.status}`,
          href: "/logistics",
          status: "open",
          recommendedAction: "escalate",
          signals,
          actor: shipment.shipper,
          createdAt: iso(shipment.createdAt),
          updatedAt: iso(shipment.updatedAt),
        });
      })
      .filter((item): item is RiskCase => Boolean(item));
  }

  private async listUserCases(): Promise<RiskCase[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { kycStatus: { in: ["rejected", "expired"] } },
          { role: "seller", sellerScore: { lt: 3 } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return users.map((user) => {
      const signals: RiskSignal[] = [];
      if (user.kycStatus === "rejected" || user.kycStatus === "expired") {
        signals.push(signal("KYC state", `KYC is ${user.kycStatus}.`, 45));
      }
      if (user.role === "seller" && user.sellerScore < 3) {
        signals.push(signal("Seller score", `Seller score is ${user.sellerScore.toFixed(1)}.`, 25));
      }

      return makeRiskCase({
        id: `user:${user.id}`,
        entity: "User",
        entityId: user.id,
        category: "identity",
        title: user.email ?? user.name ?? user.id,
        summary: `${user.role} / ${user.kycStatus}`,
        href: "/admin/risk",
        status: "open",
        recommendedAction: "escalate",
        signals,
        actor: { id: user.id, name: user.name, email: user.email, role: user.role },
        createdAt: iso(user.createdAt),
        updatedAt: iso(user.updatedAt),
      });
    });
  }

  async applyAction(input: ApplyRiskActionInput) {
    const admin = await this.assertAdmin(input.adminId);
    const { kind, entityId } = riskCaseKind(input.caseId);

    assertMarketplace(kind && entityId, "invalid_risk_case", "Risk case id is invalid.", 422);

    if (input.action === "acknowledge") {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "risk.case_acknowledged",
          entity: "RiskCase",
          entityId: input.caseId,
          afterState: { note: input.note },
        },
      });
      return { action: input.action, caseId: input.caseId };
    }

    if (kind === "listing") return this.escalateListing(admin.id, entityId, input.note);
    if (kind === "message-thread") return this.lockMessageThread(admin.id, entityId, input.note);
    if (kind === "dispute") return this.requestDisputeEvidence(admin.id, entityId, input.note);
    if (kind === "shipment") return this.escalateShipment(admin.id, entityId, input.note);
    if (kind === "user") return this.notifyRiskUser(admin.id, entityId, input.note);

    assertMarketplace(
      false,
      "unsupported_risk_action",
      "This risk case cannot be escalated yet.",
      409,
    );
  }

  private async escalateListing(adminId: string, listingId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      assertMarketplace(listing, "listing_not_found", "Listing was not found.", 404);

      const now = new Date();
      const updatedListing = await tx.listing.update({
        where: { id: listing.id },
        data: { status: "in_review", submittedAt: listing.submittedAt ?? now },
      });
      await tx.reviewQueueItem.upsert({
        where: { id: `risk-review-${listing.id}` },
        create: {
          id: `risk-review-${listing.id}`,
          listingId: listing.id,
          status: "escalated",
          slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
          aiSignals: { source: "risk_center", note },
        },
        update: {
          status: "escalated",
          slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
          aiSignals: { source: "risk_center", note },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "risk.listing_escalated",
          entity: "Listing",
          entityId: listing.id,
          beforeState: { status: listing.status },
          afterState: { status: updatedListing.status, note },
        },
      });
      await createMarketplaceNotifications(tx, [
        {
          userId: listing.sellerId,
          type: "authentication",
          title: "Listing moved to risk review",
          body: "BD Select support moved one of your listings into additional authentication review.",
          actionUrl: "/seller/growth",
          metadata: { listingId: listing.id, source: "risk_center" },
        },
      ]);

      return { action: "escalate", caseId: `listing:${listing.id}`, listing: updatedListing };
    });
  }

  private async lockMessageThread(adminId: string, threadId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const thread = await tx.messageThread.findUnique({
        where: { id: threadId },
        include: { participants: true },
      });
      assertMarketplace(thread, "thread_not_found", "Message thread was not found.", 404);

      const updatedThread = await tx.messageThread.update({
        where: { id: thread.id },
        data: {
          status: "locked",
          metadata: {
            ...metadataRecord(thread.metadata),
            lockedByRiskCenter: true,
            riskNote: note,
            lockedAt: new Date().toISOString(),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "risk.thread_locked",
          entity: "MessageThread",
          entityId: thread.id,
          beforeState: { status: thread.status },
          afterState: { status: updatedThread.status, note },
        },
      });
      await createMarketplaceNotifications(
        tx,
        thread.participants.map((participant) => ({
          userId: participant.userId,
          type: "security",
          title: "Conversation locked",
          body: "BD Select support locked a marketplace conversation for policy review.",
          actionUrl: "/inbox",
          metadata: { threadId: thread.id, source: "risk_center" },
        })),
      );

      return { action: "escalate", caseId: `message-thread:${thread.id}`, thread: updatedThread };
    });
  }

  private async requestDisputeEvidence(adminId: string, disputeId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({
        where: { id: disputeId },
        include: { order: true, barterProposal: true },
      });
      assertMarketplace(dispute, "dispute_not_found", "Dispute was not found.", 404);

      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: { status: "awaiting_evidence" },
      });
      const recipientIds = new Set<string>([dispute.raisedById]);
      if (dispute.order) {
        recipientIds.add(dispute.order.buyerId);
        recipientIds.add(dispute.order.sellerId);
      }
      if (dispute.barterProposal) {
        recipientIds.add(dispute.barterProposal.initiatorId);
        recipientIds.add(dispute.barterProposal.recipientId);
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "risk.dispute_evidence_requested",
          entity: "Dispute",
          entityId: dispute.id,
          beforeState: { status: dispute.status },
          afterState: { status: updatedDispute.status, note },
        },
      });
      await createMarketplaceNotifications(
        tx,
        [...recipientIds].map((userId) => ({
          userId,
          type: "dispute",
          title: "More dispute evidence requested",
          body: "BD Select support requested additional evidence for an active dispute.",
          actionUrl: "/evidence",
          metadata: { disputeId: dispute.id, source: "risk_center" },
        })),
      );

      return { action: "escalate", caseId: `dispute:${dispute.id}`, dispute: updatedDispute };
    });
  }

  private async escalateShipment(adminId: string, shipmentId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({ where: { id: shipmentId } });
      assertMarketplace(shipment, "shipment_not_found", "Shipment was not found.", 404);

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "risk.shipment_escalated",
          entity: "Shipment",
          entityId: shipment.id,
          afterState: { status: shipment.status, note },
        },
      });

      const recipientIds = [shipment.shipperId, shipment.recipientId].filter((id): id is string =>
        Boolean(id),
      );
      await createMarketplaceNotifications(
        tx,
        recipientIds.map((userId) => ({
          userId,
          type: shipment.barterProposalId ? "barter" : "order",
          title: "Shipment under risk review",
          body: "BD Select support escalated a shipment for logistics review.",
          actionUrl: "/logistics",
          metadata: { shipmentId: shipment.id, source: "risk_center" },
        })),
      );

      return { action: "escalate", caseId: `shipment:${shipment.id}`, shipment };
    });
  }

  private async notifyRiskUser(adminId: string, userId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      assertMarketplace(user, "user_not_found", "User account was not found.", 404);

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "risk.user_notified",
          entity: "User",
          entityId: user.id,
          afterState: { note },
        },
      });
      await createMarketplaceNotifications(tx, [
        {
          userId: user.id,
          type: "security",
          title: "Account review notice",
          body: "BD Select support needs you to review your account or transaction activity.",
          actionUrl: "/onboarding",
          metadata: { source: "risk_center" },
        },
      ]);

      return { action: "escalate", caseId: `user:${user.id}`, user };
    });
  }
}

function riskCategoryCounts(cases: RiskCase[]) {
  return Object.entries(
    cases.reduce<Record<string, number>>((counts, item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([category, count]) => ({ category, count }));
}

function riskSeverityCounts(cases: RiskCase[]) {
  return Object.entries(
    cases.reduce<Record<string, number>>((counts, item) => {
      counts[item.severity] = (counts[item.severity] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([severity, count]) => ({ severity, count }));
}
