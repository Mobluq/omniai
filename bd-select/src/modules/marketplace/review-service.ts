import type { Prisma, ReviewDecision } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canReviewListings } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";

export type DecideReviewInput = {
  reviewerId: string;
  queueItemId: string;
  decision: ReviewDecision;
  decisionReason: string;
  aiSignals?: Prisma.InputJsonObject;
};

export class ReviewService {
  async listQueue(reviewerId: string) {
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { role: true },
    });

    assertMarketplace(reviewer, "reviewer_not_found", "Reviewer account was not found.", 404);
    assertMarketplace(canReviewListings(reviewer.role), "forbidden", "Reviewer role is required.", 403);

    return prisma.reviewQueueItem.findMany({
      where: {
        status: { in: ["queued", "assigned", "in_review", "needs_more_info", "escalated"] },
      },
      include: {
        listing: {
          include: {
            brand: true,
            category: true,
            photos: { orderBy: { sortOrder: "asc" } },
            seller: { select: { id: true, name: true, sellerScore: true } },
          },
        },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ slaDueAt: "asc" }, { createdAt: "asc" }],
      take: 100,
    });
  }

  async decide(input: DecideReviewInput) {
    return prisma.$transaction(async (tx) => {
      const reviewer = await tx.user.findUnique({
        where: { id: input.reviewerId },
        select: { id: true, role: true },
      });

      assertMarketplace(reviewer, "reviewer_not_found", "Reviewer account was not found.", 404);
      assertMarketplace(canReviewListings(reviewer.role), "forbidden", "Reviewer role is required.", 403);

      const queueItem = await tx.reviewQueueItem.findUnique({
        where: { id: input.queueItemId },
        include: { listing: true },
      });

      assertMarketplace(queueItem, "queue_item_not_found", "Review queue item was not found.", 404);
      assertMarketplace(
        queueItem.listing.status === "in_review",
        "invalid_listing_state",
        "Only listings in review can be decided.",
        409,
      );

      const now = new Date();
      const listingStatus =
        input.decision === "approve"
          ? "live"
          : input.decision === "reject"
            ? "rejected"
            : input.decision === "request_more_photos"
              ? "needs_more_info"
              : "in_review";

      const reviewStatus = input.decision === "escalate" ? "escalated" : "decided";

      const reviewUpdateData: Prisma.ReviewQueueItemUpdateInput = {
        status: reviewStatus,
        decidedBy: { connect: { id: input.reviewerId } },
        decision: input.decision,
        decisionReason: input.decisionReason,
        decidedAt: now,
      };

      if (input.aiSignals) {
        reviewUpdateData.aiSignals = input.aiSignals;
      }

      const updatedQueueItem = await tx.reviewQueueItem.update({
        where: { id: queueItem.id },
        data: reviewUpdateData,
      });

      const updatedListing = await tx.listing.update({
        where: { id: queueItem.listingId },
        data: {
          status: listingStatus,
          approvedAt: input.decision === "approve" ? now : null,
          rejectedAt: input.decision === "reject" ? now : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.reviewerId,
          action: "listing_review.decided",
          entity: "ReviewQueueItem",
          entityId: queueItem.id,
          beforeState: { listingStatus: queueItem.listing.status, reviewStatus: queueItem.status },
          afterState: {
            listingStatus: updatedListing.status,
            reviewStatus: updatedQueueItem.status,
            decision: input.decision,
          },
        },
      });

      return { queueItem: updatedQueueItem, listing: updatedListing };
    });
  }
}
