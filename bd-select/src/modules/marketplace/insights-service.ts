import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canManageMarketplace } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import {
  average,
  countBy,
  dailySeries,
  percent,
  reportingRangeStart,
  sumBy,
  type ReportingRange,
} from "@/modules/marketplace/insights-policy";
import { shipmentRisk } from "@/modules/marketplace/shipping-policy";

export type AdminInsightsInput = {
  adminId: string;
  range?: ReportingRange;
};

const orderRevenueStatuses = ["paid", "shipped", "delivered", "completed", "disputed"] as const;
const activeDisputeStatuses = ["open", "under_review", "awaiting_evidence"] as const;

function dateWhere(since: Date | null): Prisma.DateTimeFilter | undefined {
  return since ? { gte: since } : undefined;
}

function isRevenueOrder(status: string) {
  return orderRevenueStatuses.some((orderStatus) => orderStatus === status);
}

function evidenceFileCount(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const files = (value as Record<string, unknown>).files;
  return Array.isArray(files) ? files.length : 0;
}

function topSellers(
  orders: {
    grossNgn: number;
    sellerId: string;
    seller: { id: string; name: string | null; email: string | null; sellerScore: number };
  }[],
) {
  const sellers = new Map<
    string,
    {
      sellerId: string;
      name: string | null;
      email: string | null;
      sellerScore: number;
      gmvNgn: number;
      orders: number;
    }
  >();

  for (const order of orders) {
    const seller = sellers.get(order.sellerId) ?? {
      sellerId: order.sellerId,
      name: order.seller.name,
      email: order.seller.email,
      sellerScore: order.seller.sellerScore,
      gmvNgn: 0,
      orders: 0,
    };
    seller.gmvNgn += order.grossNgn;
    seller.orders += 1;
    sellers.set(order.sellerId, seller);
  }

  return [...sellers.values()].sort((left, right) => right.gmvNgn - left.gmvNgn).slice(0, 8);
}

function topRevenueBreakdown<T>(
  items: T[],
  getLabel: (item: T) => string | null | undefined,
  getValue: (item: T) => number,
) {
  const rows = new Map<string, { label: string; totalNgn: number; count: number }>();
  for (const item of items) {
    const label = getLabel(item) ?? "Unassigned";
    const row = rows.get(label) ?? { label, totalNgn: 0, count: 0 };
    row.totalNgn += getValue(item);
    row.count += 1;
    rows.set(label, row);
  }
  return [...rows.values()].sort((left, right) => right.totalNgn - left.totalNgn).slice(0, 8);
}

export class InsightsService {
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

  async getAdminInsights(input: AdminInsightsInput) {
    await this.assertAdmin(input.adminId);

    const range = input.range ?? "30d";
    const since = reportingRangeStart(range);
    const createdAt = dateWhere(since);

    const [
      orders,
      listings,
      allListings,
      disputes,
      shipments,
      barters,
      messages,
      users,
      payouts,
      promotions,
      subscriptions,
      reviewQueueItems,
      signedAuditCount,
      unsignedAuditCount,
    ] = await Promise.all([
      prisma.order.findMany({
        where: createdAt ? { createdAt } : {},
        include: {
          listing: { include: { brand: true, category: true } },
          seller: { select: { id: true, name: true, email: true, sellerScore: true } },
          buyer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.listing.findMany({
        where: createdAt ? { createdAt } : {},
        include: { brand: true, category: true, seller: true, promotions: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.listing.findMany({
        include: { brand: true, category: true, promotions: true },
        orderBy: { updatedAt: "desc" },
        take: 800,
      }),
      prisma.dispute.findMany({
        where: createdAt ? { createdAt } : {},
        include: { order: true },
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
      prisma.shipment.findMany({
        where: createdAt ? { createdAt } : {},
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
      prisma.barterProposal.findMany({
        where: createdAt ? { createdAt } : {},
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.message.findMany({
        where: createdAt ? { createdAt } : {},
        select: { id: true, redactions: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.user.findMany({
        where: createdAt ? { createdAt } : {},
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.payout.findMany({
        where: createdAt ? { createdAt } : {},
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.listingPromotion.findMany({
        where: createdAt ? { createdAt } : {},
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.proSubscription.findMany({
        where: createdAt ? { createdAt } : {},
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.reviewQueueItem.findMany({
        where: createdAt ? { createdAt } : {},
        include: { listing: { include: { brand: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.auditLog.count({ where: { signature: { not: null } } }),
      prisma.auditLog.count({ where: { signature: null } }),
    ]);

    const revenueOrders = orders.filter((order) => isRevenueOrder(order.status));
    const completedOrders = orders.filter((order) => order.status === "completed");
    const escrowHeldOrders = orders.filter((order) => order.escrowState === "held");
    const activeDisputes = disputes.filter((dispute) =>
      activeDisputeStatuses.some((status) => status === dispute.status),
    );
    const activeShipments = shipments.filter((shipment) =>
      ["label_created", "pickup_scheduled", "in_transit"].includes(shipment.status),
    );
    const exceptionShipments = shipments.filter(
      (shipment) => shipmentRisk(shipment.status, shipment.updatedAt) === "exception",
    );
    const staleShipments = shipments.filter(
      (shipment) => shipmentRisk(shipment.status, shipment.updatedAt) === "stale",
    );
    const activePromotions = promotions.filter((promotion) => promotion.status === "active");
    const activeSubscriptions = subscriptions.filter((subscription) =>
      ["trialing", "active", "past_due"].includes(subscription.status),
    );
    const openReviewQueue = reviewQueueItems.filter((item) =>
      ["queued", "assigned", "in_review", "needs_more_info", "escalated"].includes(item.status),
    );
    const restrictedReviewQueue = openReviewQueue.filter((item) => item.listing.brand?.restricted);
    const liveListings = allListings.filter((listing) => listing.status === "live");
    const inReviewListings = allListings.filter((listing) =>
      ["in_review", "needs_more_info"].includes(listing.status),
    );
    const redactedMessages = messages.filter((message) => message.redactions);
    const signedTotal = signedAuditCount + unsignedAuditCount;

    return {
      range,
      generatedAt: new Date().toISOString(),
      revenue: {
        orderCount: orders.length,
        revenueOrderCount: revenueOrders.length,
        completedOrderCount: completedOrders.length,
        gmvNgn: sumBy(revenueOrders, (order) => order.grossNgn),
        completedGmvNgn: sumBy(completedOrders, (order) => order.grossNgn),
        escrowHeldNgn: sumBy(escrowHeldOrders, (order) => order.grossNgn),
        feesNgn: sumBy(
          revenueOrders,
          (order) =>
            order.buyerFeeNgn +
            order.sellerFeeNgn +
            order.authenticationFeeNgn +
            order.paymentFeeNgn,
        ),
        averageOrderValueNgn: average(revenueOrders.map((order) => order.grossNgn)),
        takeRatePercent: percent(
          sumBy(
            revenueOrders,
            (order) =>
              order.buyerFeeNgn +
              order.sellerFeeNgn +
              order.authenticationFeeNgn +
              order.paymentFeeNgn,
          ),
          sumBy(revenueOrders, (order) => order.grossNgn),
        ),
      },
      supply: {
        createdListings: listings.length,
        liveListings: liveListings.length,
        inReviewListings: inReviewListings.length,
        reservedListings: allListings.filter((listing) => listing.status === "reserved").length,
        soldListings: allListings.filter((listing) => listing.status === "sold").length,
        totalLiveValueNgn: sumBy(liveListings, (listing) => listing.priceNgn),
      },
      trust: {
        activeDisputes: activeDisputes.length,
        disputeRatePercent: percent(disputes.length, Math.max(revenueOrders.length, 1)),
        evidenceFiles: sumBy(disputes, (dispute) => evidenceFileCount(dispute.evidence)),
        redactedMessages: redactedMessages.length,
        openReviewQueue: openReviewQueue.length,
        restrictedReviewQueue: restrictedReviewQueue.length,
        auditSignatureCoveragePercent: percent(signedAuditCount, signedTotal),
      },
      logistics: {
        shipments: shipments.length,
        activeShipments: activeShipments.length,
        deliveredShipments: shipments.filter((shipment) => shipment.status === "delivered").length,
        exceptionShipments: exceptionShipments.length,
        staleShipments: staleShipments.length,
      },
      barter: {
        proposals: barters.length,
        accepted: barters.filter((proposal) => proposal.status === "accepted").length,
        inReview: barters.filter((proposal) => proposal.status === "in_review").length,
        completed: barters.filter((proposal) => proposal.status === "completed").length,
        topUpExposureNgn: sumBy(barters, (proposal) => proposal.topUpNgn),
      },
      growth: {
        activeProSubscriptions: activeSubscriptions.length,
        proSubscriptionRevenueNgn: sumBy(subscriptions, (subscription) => subscription.priceNgn),
        activePromotions: activePromotions.length,
        promotionRevenueNgn: sumBy(promotions, (promotion) => promotion.priceNgn),
      },
      users: {
        newUsers: users.length,
        buyers: users.filter((user) => user.role === "buyer").length,
        sellers: users.filter((user) => user.role === "seller").length,
        verified: users.filter((user) => user.kycStatus === "verified").length,
      },
      payouts: {
        payouts: payouts.length,
        queuedNgn: sumBy(
          payouts.filter((payout) => ["pending", "queued", "processing"].includes(payout.status)),
          (payout) => payout.amountNgn,
        ),
        paidNgn: sumBy(
          payouts.filter((payout) => payout.status === "paid"),
          (payout) => payout.amountNgn,
        ),
        failedNgn: sumBy(
          payouts.filter((payout) => payout.status === "failed"),
          (payout) => payout.amountNgn,
        ),
      },
      series: {
        dailyGmv: dailySeries(
          revenueOrders,
          (order) => order.createdAt,
          (order) => order.grossNgn,
        ),
        dailyOrders: dailySeries(
          orders,
          (order) => order.createdAt,
          () => 1,
        ),
        dailyListings: dailySeries(
          listings,
          (listing) => listing.createdAt,
          () => 1,
        ),
      },
      breakdowns: {
        listingStatuses: countBy(allListings, (listing) => listing.status),
        orderStatuses: countBy(orders, (order) => order.status),
        brandRevenue: topRevenueBreakdown(
          revenueOrders,
          (order) => order.listing.brand?.name,
          (order) => order.grossNgn,
        ),
        categoryRevenue: topRevenueBreakdown(
          revenueOrders,
          (order) => order.listing.category?.name,
          (order) => order.grossNgn,
        ),
        topSellers: topSellers(revenueOrders),
      },
    };
  }
}
